import { prisma } from '../config/db.js';
import { calculateTradeStatsBundle } from '../utils/performanceEngine.js';
import { getOvertradingStatus } from './analyticsService.js';

const WINDOW_DAYS = 90;
const MAX_SCORE = 100;
const OVERTRADING_THRESHOLD = 5;

const WEIGHTS = {
  dailyLossViolation: 20,
  overtrading: 10,
  consecutiveLosses: 10,
  lowAvgR: 10,
  drawdownBreach: 15,
  recoveryBonus: 5
};

function utcDateKey(date) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function windowStartDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (WINDOW_DAYS - 1), 0, 0, 0, 0));
}

function clampScore(score) {
  return Math.max(0, Math.min(MAX_SCORE, score));
}

function pushDeduction(deductions, violations, code, points, message, suggestion) {
  deductions.push({ code, pointsLost: points, message, suggestion });
  violations.push(code);
}

// Institutional discipline scoring model (0-100): evaluates behavioral risk and recovery signals.
export async function getDisciplineScore(userId) {
  const since = windowStartDate();

  const [user, trades, dailyLocks, overtradingStatus] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { accountBalance: true } }),
    prisma.trade.findMany({
      where: {
        userId,
        OR: [{ closedAt: { gte: since } }, { createdAt: { gte: since } }]
      },
      orderBy: [{ closedAt: 'asc' }, { openedAt: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        pnl: true,
        rMultiple: true,
        createdAt: true,
        closedAt: true,
        openedAt: true
      }
    }),
    prisma.dailyLockEvent.findMany({
      where: { userId, tradeDate: { gte: since } },
      select: { tradeDate: true }
    }),
    getOvertradingStatus(userId)
  ]);

  const closedTrades = trades.filter((t) => Boolean(t.closedAt));

  if (trades.length === 0 && closedTrades.length === 0) {
    return {
      score: null,
      status: 'INSUFFICIENT_DATA',
      riskAdherence: null,
      overtrading: null,
      rQuality: null,
      drawdownControl: null,
      bonus: 0,
      violations: [],
      deductions: [],
      metrics: {
        evaluationWindowDays: WINDOW_DAYS,
        tradesEvaluated: 0,
        closedTradesEvaluated: 0
      }
    };
  }

  const startingBalance = Number(user?.accountBalance || 0);
  const dailyLockDayKeys = new Set(dailyLocks.map((row) => utcDateKey(row.tradeDate)));
  const tradeCountByDay = new Map();
  const tradedDays = new Set();

  for (const trade of trades) {
    const tradeDayKey = utcDateKey(trade.closedAt || trade.openedAt || trade.createdAt);
    tradedDays.add(tradeDayKey);
    tradeCountByDay.set(tradeDayKey, (tradeCountByDay.get(tradeDayKey) || 0) + 1);
  }

  const performance = calculateTradeStatsBundle(closedTrades, startingBalance);
  const maxConsecutiveLosses = performance.consecutiveLosses;
  const avgRMultiple = Number(performance.avgRMultiple || 0);
  const maxDrawdownPct = Number(performance.maxDrawdownPct || 0);
  const maxTradesPerUtcDay = tradeCountByDay.size ? Math.max(...tradeCountByDay.values()) : 0;
  const hasOvertrading = maxTradesPerUtcDay > OVERTRADING_THRESHOLD;
  const hasDailyLossViolation = dailyLockDayKeys.size > 0;
  const hasConsecutiveLossViolation = maxConsecutiveLosses > 3;
  const hasLowRViolation = closedTrades.length > 0 && avgRMultiple < 1;
  const hasDrawdownViolation = maxDrawdownPct > 10;

  const deductions = [];
  const violations = [];
  let totalPenalty = 0;

  if (hasDailyLossViolation) {
    totalPenalty += WEIGHTS.dailyLossViolation;
    pushDeduction(
      deductions,
      violations,
      'DAILY_LOSS_VIOLATION',
      WEIGHTS.dailyLossViolation,
      'Daily risk limit was exceeded at least once in the scoring window.',
      'Reduce position size after drawdowns and lower daily loss cap exposure.'
    );
  }

  if (hasOvertrading) {
    totalPenalty += WEIGHTS.overtrading;
    pushDeduction(
      deductions,
      violations,
      'OVERTRADING',
      WEIGHTS.overtrading,
      `Trade frequency exceeded ${OVERTRADING_THRESHOLD} trades in a UTC day (max observed: ${maxTradesPerUtcDay}).`,
      'Limit trade count per session and define a pre-market trade cap.'
    );
  }

  if (hasConsecutiveLossViolation) {
    totalPenalty += WEIGHTS.consecutiveLosses;
    pushDeduction(
      deductions,
      violations,
      'CONSECUTIVE_LOSSES',
      WEIGHTS.consecutiveLosses,
      `Consecutive losses exceeded 3 (max observed: ${maxConsecutiveLosses}).`,
      'Pause after 3 losses and review execution quality before resuming.'
    );
  }

  if (hasLowRViolation) {
    totalPenalty += WEIGHTS.lowAvgR;
    pushDeduction(
      deductions,
      violations,
      'LOW_AVG_R',
      WEIGHTS.lowAvgR,
      `Average R multiple is below 1 (${avgRMultiple.toFixed(2)}).`,
      'Improve stop placement discipline and avoid low-quality setups.'
    );
  }

  if (hasDrawdownViolation) {
    totalPenalty += WEIGHTS.drawdownBreach;
    pushDeduction(
      deductions,
      violations,
      'DRAWDOWN_BREACH',
      WEIGHTS.drawdownBreach,
      `Max drawdown exceeded 10% (${maxDrawdownPct.toFixed(2)}%).`,
      'Cut risk per trade and enforce tighter drawdown pause rules.'
    );
  }

  // Recovery bonus: reward stable behavior if there are at least 3 traded UTC days with no modeled daily violations.
  const stableDaysCount = Array.from(tradedDays).filter((dayKey) => {
    const overtradedThatDay = (tradeCountByDay.get(dayKey) || 0) > OVERTRADING_THRESHOLD;
    const lossBreachThatDay = dailyLockDayKeys.has(dayKey);
    return !overtradedThatDay && !lossBreachThatDay;
  }).length;

  const qualifiesForRecoveryBonus =
    stableDaysCount >= 3 &&
    !hasConsecutiveLossViolation &&
    !hasLowRViolation &&
    !hasDrawdownViolation;

  let bonus = qualifiesForRecoveryBonus ? WEIGHTS.recoveryBonus : 0;

  // Behavior monitor impact adjusts discipline score dynamically using real-time overtrading intensity.
  const behaviorMonitorImpact = Number(overtradingStatus?.behavioralScoreImpact || 0);
  if (behaviorMonitorImpact < 0) {
    pushDeduction(
      deductions,
      violations,
      'BEHAVIOR_MONITOR_IMPACT',
      Math.abs(behaviorMonitorImpact),
      `Behavior monitor detected elevated overtrading intensity (${overtradingStatus?.intensityLevel || 'UNKNOWN'}).`,
      overtradingStatus?.suggestion || 'Reduce trading frequency and reassess your process.'
    );
  } else if (behaviorMonitorImpact > 0) {
    bonus += behaviorMonitorImpact;
  }

  const score = clampScore(MAX_SCORE - totalPenalty + bonus + Math.min(0, behaviorMonitorImpact));

  // Category scores are normalized sub-scores that sum to 100 before bonus adjustments.
  const riskAdherencePenalty =
    (hasDailyLossViolation ? WEIGHTS.dailyLossViolation : 0) + (hasConsecutiveLossViolation ? WEIGHTS.consecutiveLosses : 0);
  const overtradingPenalty = hasOvertrading ? WEIGHTS.overtrading : 0;
  const rQualityPenalty = hasLowRViolation ? WEIGHTS.lowAvgR : 0;
  const drawdownPenalty = hasDrawdownViolation ? WEIGHTS.drawdownBreach : 0;

  return {
    score,
    status: 'READY',
    riskAdherence: Math.max(0, 40 - riskAdherencePenalty),
    overtrading: Math.max(0, 20 - overtradingPenalty),
    rQuality: Math.max(0, 20 - rQualityPenalty),
    drawdownControl: Math.max(0, 20 - drawdownPenalty),
    bonus,
    violations,
    deductions,
    metrics: {
      evaluationWindowDays: WINDOW_DAYS,
      tradesEvaluated: trades.length,
      closedTradesEvaluated: closedTrades.length,
      dailyLossBreachCount: dailyLockDayKeys.size,
      maxConsecutiveLosses,
      avgRMultiple: Number(avgRMultiple.toFixed(2)),
      maxTradesPerUtcDay,
      maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
      stableDaysCount,
      overtradingIntensityLevel: overtradingStatus?.intensityLevel || 'SAFE',
      behaviorMonitorImpact
    }
  };
}
