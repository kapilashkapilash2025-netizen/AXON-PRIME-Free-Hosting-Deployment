import { prisma } from '../config/db.js';

function getUtcDayRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  return { start, end };
}

async function persistBehavioralImpactLog(userId, payload) {
  const { start } = getUtcDayRange();

  try {
    const existing = await prisma.behavioralImpactLog.findFirst({
      where: { userId, logDate: start },
      select: { id: true }
    });

    const data = {
      userId,
      logDate: start,
      overtradingStatus: payload.status,
      intensityLevel: payload.intensityLevel,
      behavioralScoreImpact: payload.behavioralScoreImpact,
      flags: payload.flags,
      suggestion: payload.suggestion
    };

    if (existing) {
      await prisma.behavioralImpactLog.update({ where: { id: existing.id }, data });
    } else {
      await prisma.behavioralImpactLog.create({ data });
    }
  } catch {
    // Ignore if migration is not yet applied; monitoring should still function.
  }
}

export async function getRiskHeatmap(userId) {
  const [user, openTrades] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { currentEquity: true } }),
    prisma.trade.findMany({
      where: { userId, closedAt: null },
      select: { symbol: true, entryPrice: true, quantity: true }
    })
  ]);

  const equity = Math.max(Number(user?.currentEquity || 0), 1);
  const bucketsMap = new Map();

  for (const trade of openTrades) {
    const symbol = trade.symbol.toUpperCase();
    const exposureValue = Math.abs(Number(trade.entryPrice) * Number(trade.quantity));
    bucketsMap.set(symbol, (bucketsMap.get(symbol) || 0) + exposureValue);
  }

  const exposureBuckets = Array.from(bucketsMap.entries())
    .map(([symbol, exposureValue]) => ({
      symbol,
      exposureValue: Number(exposureValue.toFixed(2)),
      exposurePct: Number(((exposureValue / equity) * 100).toFixed(2))
    }))
    .sort((a, b) => b.exposurePct - a.exposurePct);

  const totalOpenExposurePct = Number(
    exposureBuckets.reduce((sum, row) => sum + row.exposurePct, 0).toFixed(2)
  );

  return {
    totalOpenExposurePct,
    openPositions: openTrades.length,
    exposureBuckets
  };
}

export async function getOvertradingSignals(userId) {
  const { start, end } = getUtcDayRange();
  const trades = await prisma.trade.findMany({
    where: { userId, createdAt: { gte: start, lte: end } },
    orderBy: { createdAt: 'asc' },
    select: { pnl: true, riskAmount: true }
  });

  const flags = [];

  if (trades.length > 12) {
    flags.push('High trade frequency detected for current UTC day.');
  }

  for (let i = 1; i < trades.length; i += 1) {
    const prev = trades[i - 1];
    const curr = trades[i];
    if (Number(prev.pnl) < 0 && Number(curr.riskAmount) > Number(prev.riskAmount)) {
      flags.push('Risk size increased after a loss.');
      break;
    }
  }

  return {
    totalTradesTodayUtc: trades.length,
    flags
  };
}

export async function getOvertradingStatus(userId) {
  const { start, end } = getUtcDayRange();
  const last24hStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [tradesToday, dailyLossBreachToday] = await Promise.all([
    prisma.trade.findMany({
      where: { userId, createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, pnl: true }
    }),
    prisma.dailyLockEvent.findFirst({
      where: { userId, tradeDate: { gte: last24hStart } },
      select: { id: true }
    })
  ]);

  const tradesLast24h = await prisma.trade.findMany({
    where: { userId, createdAt: { gte: last24hStart } },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true, pnl: true }
  });
  const flags = [];
  let impulseDetected = false;
  let revengeDetected = false;
  let rapidEntriesDetected = false;

  if (tradesToday.length > 8) {
    flags.push('Excessive Trading');
  } else if (tradesToday.length > 5) {
    flags.push('High Frequency');
  }

  let shortIntervalStreak = 0;
  for (let i = 1; i < tradesToday.length; i += 1) {
    const prev = tradesToday[i - 1];
    const curr = tradesToday[i];
    const minutesBetween = (new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime()) / 60000;
    if (minutesBetween >= 0 && minutesBetween < 10) {
      impulseDetected = true;
      shortIntervalStreak += 1;
      if (minutesBetween < 5 || shortIntervalStreak >= 2) {
        rapidEntriesDetected = true;
      }
    } else {
      shortIntervalStreak = 0;
    }
  }

  let consecutiveLosses = 0;
  for (const trade of tradesToday) {
    if (Number(trade.pnl) < 0) {
      consecutiveLosses += 1;
      if (consecutiveLosses >= 3) {
        revengeDetected = true;
        break;
      }
    } else {
      consecutiveLosses = 0;
    }
  }

  if (impulseDetected || rapidEntriesDetected || revengeDetected) {
    flags.push('Impulse trading pattern detected.');
  }
  if (revengeDetected) {
    flags.push('Revenge Trading Risk');
  }

  let intensityLevel = 'SAFE';
  if (tradesToday.length >= 10) intensityLevel = 'CRITICAL';
  else if (tradesToday.length >= 7) intensityLevel = 'HIGH_RISK';
  else if (tradesToday.length >= 4) intensityLevel = 'CAUTION';

  let behavioralScoreImpact = 0;
  if (intensityLevel === 'CAUTION') behavioralScoreImpact -= 2;
  if (intensityLevel === 'HIGH_RISK') behavioralScoreImpact -= 5;
  if (intensityLevel === 'CRITICAL') behavioralScoreImpact -= 8;
  if (impulseDetected) behavioralScoreImpact -= 2;
  if (rapidEntriesDetected) behavioralScoreImpact -= 1;
  if (revengeDetected) behavioralScoreImpact -= 4;

  const noViolations24h =
    tradesLast24h.length > 0 &&
    tradesLast24h.length <= 3 &&
    !impulseDetected &&
    !revengeDetected &&
    !dailyLossBreachToday;
  if (noViolations24h) {
    behavioralScoreImpact += 2;
  }

  behavioralScoreImpact = Math.max(-15, Math.min(5, behavioralScoreImpact));

  let status = 'NORMAL';
  if (intensityLevel === 'CRITICAL' || revengeDetected) {
    status = 'CRITICAL';
  } else if (intensityLevel === 'HIGH_RISK' || intensityLevel === 'CAUTION' || flags.length > 0) {
    status = 'WARNING';
  }

  const suggestion =
    status === 'CRITICAL'
      ? 'Pause trading and review your risk plan before placing any new trades today.'
      : status === 'WARNING'
        ? 'Trading frequency is increasing. Slow down and wait for higher-quality setups.'
        : noViolations24h
          ? 'Good discipline maintained.'
          : 'Trading activity is within normal behavioral risk limits.';

  let scoreImpactReason = 'NO_IMPACT';
  if (behavioralScoreImpact <= -8) scoreImpactReason = 'Excessive Trading';
  else if (behavioralScoreImpact <= -5) scoreImpactReason = 'High Frequency Trading';
  else if (behavioralScoreImpact < 0) scoreImpactReason = 'Behavioral Risk Pattern';
  else if (behavioralScoreImpact > 0) scoreImpactReason = 'Good Discipline Maintained';

  const notificationMessage =
    behavioralScoreImpact !== 0
      ? `Discipline Score ${behavioralScoreImpact > 0 ? '+' : ''}${behavioralScoreImpact} (${scoreImpactReason})`
      : null;

  const response = {
    tradesToday: tradesToday.length,
    status,
    intensityLevel,
    behavioralScoreImpact,
    flags,
    suggestion,
    notificationMessage,
    noViolations24h
  };

  await persistBehavioralImpactLog(userId, response);
  return response;
}

export async function getEquityCurveSeries(userId) {
  const [user, trades] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { accountBalance: true }
    }),
    prisma.trade.findMany({
      where: { userId, closedAt: { not: null } },
      orderBy: { closedAt: 'asc' },
      select: { pnl: true, closedAt: true }
    })
  ]);

  const startingBalance = Number(user?.accountBalance || 0);

  if (!trades.length) {
    return { status: 'NO_DATA' };
  }

  let cumulativeEquity = startingBalance;
  let peak = startingBalance;
  const points = trades.map((trade) => {
    cumulativeEquity += Number(trade.pnl);
    peak = Math.max(peak, cumulativeEquity);
    const drawdownPct = peak > 0 ? ((peak - cumulativeEquity) / peak) * 100 : 0;

    return {
      date: trade.closedAt,
      equity: Number(cumulativeEquity.toFixed(2)),
      drawdownPercent: Number(drawdownPct.toFixed(2))
    };
  });

  return points;
}
