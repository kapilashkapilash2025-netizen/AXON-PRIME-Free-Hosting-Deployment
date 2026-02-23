import { TradeResult } from '@prisma/client';
import { prisma } from '../config/db.js';
import { getDrawdownStatus } from '../utils/risk.js';
import { calculateTradeStatsBundle, getPredictiveTriggerConditions } from '../utils/performanceEngine.js';

function computeRMultiple(pnl, riskAmount) {
  if (!riskAmount) return 0;
  return Number((pnl / riskAmount).toFixed(2));
}

function computeResult(pnl) {
  if (pnl > 0) return TradeResult.WIN;
  if (pnl < 0) return TradeResult.LOSS;
  return TradeResult.BE;
}

async function refreshEquity(userId, pnlDelta) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const currentEquity = Number(user.currentEquity) + pnlDelta;
  const equityPeak = Math.max(Number(user.equityPeak), currentEquity);
  const drawdownPct = equityPeak > 0 ? ((equityPeak - currentEquity) / equityPeak) * 100 : 0;

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { currentEquity, equityPeak } }),
    prisma.equitySnapshot.create({
      data: {
        userId,
        equity: currentEquity,
        drawdownPct,
        status: getDrawdownStatus(drawdownPct)
      }
    })
  ]);
}

export async function createTrade(userId, payload) {
  const pnl = Number(payload.pnl);
  const riskAmount = Number(payload.riskAmount);
  const trade = await prisma.trade.create({
    data: {
      userId,
      ...payload,
      pnl,
      riskAmount,
      rMultiple: computeRMultiple(pnl, riskAmount),
      result: computeResult(pnl)
    }
  });

  await refreshEquity(userId, pnl);
  return trade;
}

export async function updateTrade(userId, tradeId, payload) {
  const previous = await prisma.trade.findFirst({ where: { id: tradeId, userId } });
  if (!previous) return null;

  const pnl = Number(payload.pnl);
  const riskAmount = Number(payload.riskAmount);
  const updated = await prisma.trade.update({
    where: { id: tradeId },
    data: {
      ...payload,
      pnl,
      riskAmount,
      rMultiple: computeRMultiple(pnl, riskAmount),
      result: computeResult(pnl)
    }
  });

  const delta = pnl - Number(previous.pnl);
  if (delta !== 0) {
    await refreshEquity(userId, delta);
  }

  return updated;
}

export async function deleteTrade(userId, tradeId) {
  const existing = await prisma.trade.findFirst({ where: { id: tradeId, userId } });
  if (!existing) return null;

  await prisma.trade.delete({ where: { id: tradeId } });
  await refreshEquity(userId, -Number(existing.pnl));
  return existing;
}

export async function listTrades(userId) {
  const trades = await prisma.trade.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountBalance: true }
  });

  const performance = calculateTradeStatsBundle(trades, Number(user?.accountBalance || 0));
  const triggers = getPredictiveTriggerConditions({
    winRate: performance.winRate,
    consecutiveLosses: performance.consecutiveLosses,
    riskPerTradePct: performance.riskPerTradeAveragePct,
    drawdownPct: performance.currentDrawdownPct
  });

  return {
    trades,
    stats: {
      totalTrades: performance.totalClosedTrades,
      winRate: performance.winRate,
      avgRMultiple: performance.avgRMultiple,
      profitFactor: performance.profitFactor
    },
    performance: {
      ...performance,
      triggers
    }
  };
}
