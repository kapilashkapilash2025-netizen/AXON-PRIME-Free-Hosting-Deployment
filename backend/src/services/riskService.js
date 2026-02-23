import { prisma } from '../config/db.js';
import { calcPositionSize, getDrawdownStatus } from '../utils/risk.js';
import {
  calculateCompositeRiskScore,
  calculateTradeStatsBundle,
  getPredictiveTriggerConditions
} from '../utils/performanceEngine.js';
import { getDisciplineScore } from './disciplineService.js';

export async function calculatePosition(payload) {
  return calcPositionSize(payload);
}

function getUtcDayRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  return { start, end };
}

export async function isDailyTradingLocked(userId) {
  const { start, end } = getUtcDayRange();
  const [user, setting, dailyPnlAgg] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { accountBalance: true, currentEquity: true, equityPeak: true }
    }),
    prisma.riskSetting.findUnique({ where: { userId }, select: { maxDailyLossPct: true } }),
    prisma.trade.aggregate({
      where: { userId, closedAt: { gte: start, lte: end } },
      _sum: { pnl: true }
    })
  ]);

  const accountBalance = Number(user.accountBalance);
  const maxDailyLossPct = Number(setting?.maxDailyLossPct || 2);
  const maxLossAllowed = (accountBalance * maxDailyLossPct) / 100;
  const dailyPnl = Number(dailyPnlAgg._sum.pnl || 0);
  const tradingLocked = dailyPnl <= -Math.abs(maxLossAllowed);

  if (tradingLocked) {
    const existing = await prisma.dailyLockEvent.findFirst({
      where: { userId, tradeDate: { gte: start, lte: end } },
      select: { id: true }
    });

    if (existing) {
      await prisma.dailyLockEvent.update({
        where: { id: existing.id },
        data: { cumulativePnl: dailyPnl, maxLossAllowed }
      });
    } else {
      await prisma.dailyLockEvent.create({
        data: {
          userId,
          tradeDate: start,
          cumulativePnl: dailyPnl,
          maxLossAllowed
        }
      });
    }
  }

  return { dailyPnl, maxDailyLossPct, maxLossAllowed, tradingLocked };
}

export async function upsertRiskSetting(userId, data) {
  return prisma.riskSetting.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data }
  });
}

export async function getRiskSnapshot(userId) {
  const [user, lock, discipline, trades] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { accountBalance: true, currentEquity: true, equityPeak: true }
    }),
    isDailyTradingLocked(userId),
    getDisciplineScore(userId),
    prisma.trade.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        userId: true,
        symbol: true,
        side: true,
        entryPrice: true,
        stopLoss: true,
        exitPrice: true,
        quantity: true,
        riskAmount: true,
        rewardAmount: true,
        pnl: true,
        rMultiple: true,
        openedAt: true,
        closedAt: true,
        createdAt: true
      }
    })
  ]);

  const accountBalance = Number(user.accountBalance);
  const currentEquity = Number(user.currentEquity);
  const equityPeak = Number(user.equityPeak);
  const accountLevelDrawdownPct = equityPeak > 0 ? ((equityPeak - currentEquity) / equityPeak) * 100 : 0;
  const performance = calculateTradeStatsBundle(trades, accountBalance);
  const performanceDrawdownPct = performance.currentDrawdownPct;
  const drawdownPct = performance.totalClosedTrades > 0 ? performanceDrawdownPct : accountLevelDrawdownPct;
  const drawdownStatus = getDrawdownStatus(drawdownPct);
  const overtradingFrequencyToday = trades.filter((t) => {
    const d = new Date(t.createdAt);
    const now = new Date();
    return (
      d.getUTCFullYear() === now.getUTCFullYear() &&
      d.getUTCMonth() === now.getUTCMonth() &&
      d.getUTCDate() === now.getUTCDate()
    );
  }).length;
  const compositeRisk = calculateCompositeRiskScore({
    drawdownPct,
    consecutiveLosses: performance.consecutiveLosses,
    riskPerTradePct: performance.riskPerTradeAveragePct,
    overtradingFrequency: overtradingFrequencyToday
  });
  const performanceTriggers = getPredictiveTriggerConditions({
    winRate: performance.winRate,
    consecutiveLosses: performance.consecutiveLosses,
    riskPerTradePct: performance.riskPerTradeAveragePct,
    drawdownPct
  });
  const psychologicalMessages = [];
  if (performance.consecutiveLosses >= 3) {
    psychologicalMessages.push({
      code: 'REVENGE_TRADING_PATTERN_EMERGING',
      tone: 'danger',
      message: 'Revenge Trading Pattern Emerging.'
    });
  }
  if (performance.riskPerTradeAveragePct > 3) {
    psychologicalMessages.push({
      code: 'CAPITAL_DAMAGE_PATTERN_DETECTED',
      tone: 'danger',
      message: 'Capital Damage Pattern Detected.'
    });
  }
  if (drawdownPct > 10) {
    psychologicalMessages.push({
      code: 'RECOVERY_MODE_RECOMMENDED',
      tone: 'warning',
      message: 'Recovery Mode Recommended.'
    });
  }
  const disciplineScore = typeof discipline?.score === 'number' ? discipline.score : null;

  let riskStatus = lock.tradingLocked ? 'CRITICAL' : drawdownStatus;
  let riskStatusDriver = lock.tradingLocked ? 'DAILY_LOSS_LOCK' : 'DRAWDOWN';

  if (!lock.tradingLocked && disciplineScore != null) {
    if (disciplineScore < 40) {
      riskStatus = 'CRITICAL';
      riskStatusDriver = 'DISCIPLINE_SCORE';
    } else if (disciplineScore < 60 && riskStatus === 'SAFE') {
      riskStatus = 'WARNING';
      riskStatusDriver = 'DISCIPLINE_SCORE';
    }
  }

  if (!lock.tradingLocked && compositeRisk.band === 'CRITICAL') {
    riskStatus = 'CRITICAL';
    riskStatusDriver = 'COMPOSITE_RISK_SCORE';
  } else if (!lock.tradingLocked && compositeRisk.band === 'DANGER' && riskStatus === 'SAFE') {
    riskStatus = 'WARNING';
    riskStatusDriver = 'COMPOSITE_RISK_SCORE';
  }

  return {
    accountBalance,
    currentEquity,
    equityPeak,
    dailyPnl: lock.dailyPnl,
    maxDailyLossPct: lock.maxDailyLossPct,
    maxLossAllowed: Number(lock.maxLossAllowed.toFixed(2)),
    tradingLocked: lock.tradingLocked,
    drawdownPct: Number(drawdownPct.toFixed(2)),
    accountDrawdownPct: Number(accountLevelDrawdownPct.toFixed(2)),
    drawdownStatus,
    disciplineScore,
    winRate: performance.winRate,
    avgRMultiple: performance.avgRMultiple,
    profitFactor: performance.profitFactor,
    maxDrawdownPct: performance.maxDrawdownPct,
    consecutiveLosses: performance.consecutiveLosses,
    riskPerTradeAveragePct: performance.riskPerTradeAveragePct,
    riskCompositeScore: compositeRisk.score,
    riskCompositeBand: compositeRisk.band,
    riskCompositeComponents: compositeRisk.components,
    performanceTriggers,
    psychologicalMessages,
    riskStatus,
    riskStatusDriver,
    lockResetAtUtc: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1, 0, 0, 0, 0))
  };
}

export async function getEquityCurve(userId) {
  const snapshots = await prisma.equitySnapshot.findMany({
    where: { userId },
    orderBy: { snapshotAt: 'asc' },
    take: 300,
    select: { snapshotAt: true, equity: true, drawdownPct: true, status: true }
  });

  return snapshots.map((row) => ({
    timestamp: row.snapshotAt,
    equity: Number(row.equity),
    drawdownPct: Number(row.drawdownPct),
    status: row.status
  }));
}
