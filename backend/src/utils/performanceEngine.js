function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round(value, digits = 2) {
  const n = toNumber(value, 0);
  return Number(n.toFixed(digits));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getTradeDate(trade) {
  return trade?.date || trade?.closedAt || trade?.openedAt || trade?.createdAt || null;
}

function isClosedTrade(trade) {
  if (!trade) return false;
  if (trade.status) return String(trade.status).toUpperCase() === 'CLOSED';
  return Boolean(trade.closedAt);
}

function getClosedTradesSorted(trades = []) {
  return trades
    .filter(isClosedTrade)
    .slice()
    .sort((a, b) => new Date(getTradeDate(a)).getTime() - new Date(getTradeDate(b)).getTime());
}

function getTradeRMultiple(trade) {
  const explicitR = toNumber(trade?.rMultiple, NaN);
  if (Number.isFinite(explicitR)) return explicitR;

  const riskAmount = toNumber(trade?.riskAmount, 0);
  if (riskAmount <= 0) return 0;

  if (trade?.rewardAmount != null) {
    return toNumber(trade.rewardAmount, 0) / riskAmount;
  }

  return toNumber(trade?.pnl, 0) / riskAmount;
}

function getUtcDateKey(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return 'invalid';
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function calculateWinRate(trades = []) {
  const closed = getClosedTradesSorted(trades);
  if (!closed.length) return 0;
  const wins = closed.reduce((sum, t) => sum + (toNumber(t.pnl, 0) > 0 ? 1 : 0), 0);
  return round((wins / closed.length) * 100);
}

export function calculateAverageRR(trades = []) {
  const closed = getClosedTradesSorted(trades);
  if (!closed.length) return 0;
  const total = closed.reduce((sum, t) => sum + getTradeRMultiple(t), 0);
  return round(total / closed.length);
}

export function generateEquityCurve(trades = [], options = {}) {
  const startingBalance = Math.max(toNumber(options.startingBalance ?? options.accountBalance, 0), 0);
  const closed = getClosedTradesSorted(trades);
  let equity = startingBalance;
  let peakEquity = startingBalance;

  const curve = closed.map((trade) => {
    equity += toNumber(trade.pnl, 0);
    peakEquity = Math.max(peakEquity, equity);
    const drawdownPct = peakEquity > 0 ? ((peakEquity - equity) / peakEquity) * 100 : 0;

    return {
      date: getTradeDate(trade),
      equity: round(equity),
      peakEquity: round(peakEquity),
      drawdownPercent: round(drawdownPct),
      pnl: round(toNumber(trade.pnl, 0)),
      symbol: trade.symbol || null
    };
  });

  return curve;
}

export function calculateMaxDrawdown(trades = [], options = {}) {
  const curve = generateEquityCurve(trades, options);
  if (!curve.length) return 0;
  return round(curve.reduce((max, p) => Math.max(max, toNumber(p.drawdownPercent, 0)), 0));
}

export function calculateCurrentDrawdown(trades = [], options = {}) {
  const curve = generateEquityCurve(trades, options);
  if (!curve.length) return 0;
  return round(curve[curve.length - 1].drawdownPercent);
}

export function calculateConsecutiveLosses(trades = []) {
  const closed = getClosedTradesSorted(trades);
  let streak = 0;
  let maxStreak = 0;

  for (const trade of closed) {
    if (toNumber(trade.pnl, 0) < 0) {
      streak += 1;
      maxStreak = Math.max(maxStreak, streak);
    } else {
      streak = 0;
    }
  }

  return maxStreak;
}

export function calculateProfitFactor(trades = []) {
  const closed = getClosedTradesSorted(trades);
  let grossProfit = 0;
  let grossLossAbs = 0;

  for (const trade of closed) {
    const pnl = toNumber(trade.pnl, 0);
    if (pnl > 0) grossProfit += pnl;
    else if (pnl < 0) grossLossAbs += Math.abs(pnl);
  }

  if (grossLossAbs === 0) return grossProfit > 0 ? 999 : 0;
  return round(grossProfit / grossLossAbs);
}

export function calculateRiskPerTradeAverage(trades = [], accountBalance = 0) {
  const closed = getClosedTradesSorted(trades);
  const balance = Math.max(toNumber(accountBalance, 0), 0);
  if (!closed.length || balance <= 0) return 0;

  const totalPct = closed.reduce((sum, trade) => {
    const riskAmount = Math.max(toNumber(trade.riskAmount, 0), 0);
    return sum + (riskAmount / balance) * 100;
  }, 0);

  return round(totalPct / closed.length);
}

export function calculateTradeFrequencyPerDay(trades = []) {
  if (!Array.isArray(trades) || !trades.length) return 0;
  const counts = new Map();
  for (const trade of trades) {
    const key = getUtcDateKey(getTradeDate(trade));
    if (key === 'invalid') continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  if (!counts.size) return 0;
  return round(Array.from(counts.values()).reduce((a, b) => a + b, 0) / counts.size);
}

export function calculateTradeStatsBundle(trades = [], accountBalance = 0) {
  const closedTrades = getClosedTradesSorted(trades);
  const equityCurve = generateEquityCurve(closedTrades, { startingBalance: accountBalance });

  return {
    totalClosedTrades: closedTrades.length,
    winRate: calculateWinRate(closedTrades),
    avgRMultiple: calculateAverageRR(closedTrades),
    maxDrawdownPct: calculateMaxDrawdown(closedTrades, { startingBalance: accountBalance }),
    currentDrawdownPct: calculateCurrentDrawdown(closedTrades, { startingBalance: accountBalance }),
    consecutiveLosses: calculateConsecutiveLosses(closedTrades),
    profitFactor: calculateProfitFactor(closedTrades),
    riskPerTradeAveragePct: calculateRiskPerTradeAverage(closedTrades, accountBalance),
    tradeFrequencyPerDay: calculateTradeFrequencyPerDay(trades),
    equityCurve
  };
}

function scoreBandFromValue(score) {
  if (score <= 30) return 'SAFE';
  if (score <= 60) return 'CAUTION';
  if (score <= 80) return 'DANGER';
  return 'CRITICAL';
}

export function calculateCompositeRiskScore(input = {}) {
  const drawdownPct = Math.max(toNumber(input.drawdownPct, 0), 0);
  const consecutiveLosses = Math.max(toNumber(input.consecutiveLosses, 0), 0);
  const riskPerTradePct = Math.max(toNumber(input.riskPerTradePct, 0), 0);
  const overtradingFrequency = Math.max(toNumber(input.overtradingFrequency, 0), 0);

  const normalized = {
    drawdown: clamp((drawdownPct / 20) * 100, 0, 100),
    consecutiveLosses: clamp((consecutiveLosses / 5) * 100, 0, 100),
    riskPerTrade: clamp((riskPerTradePct / 5) * 100, 0, 100),
    overtrading: clamp((Math.max(overtradingFrequency - 3, 0) / 9) * 100, 0, 100)
  };

  const score = round(
    normalized.drawdown * 0.35 +
      normalized.consecutiveLosses * 0.2 +
      normalized.riskPerTrade * 0.25 +
      normalized.overtrading * 0.2
  );

  return {
    score,
    band: scoreBandFromValue(score),
    components: {
      drawdown: round(normalized.drawdown),
      consecutiveLosses: round(normalized.consecutiveLosses),
      riskPerTrade: round(normalized.riskPerTrade),
      overtrading: round(normalized.overtrading)
    }
  };
}

export function getPredictiveTriggerConditions(input = {}) {
  const winRate = toNumber(input.winRate, 0);
  const consecutiveLosses = toNumber(input.consecutiveLosses, 0);
  const riskPerTradePct = toNumber(input.riskPerTradePct, 0);
  const drawdownPct = toNumber(input.drawdownPct, 0);

  const triggers = [];

  if (winRate < 40 && consecutiveLosses >= 3) {
    triggers.push({
      code: 'EMOTIONAL_TRADING_WARNING',
      message: 'Win rate is below 40% while loss streak is 3+ trades.'
    });
  }

  if (riskPerTradePct > 3) {
    triggers.push({
      code: 'CAPITAL_DAMAGE_RISK',
      message: 'Average risk per trade exceeds 3% of account balance.'
    });
  }

  if (drawdownPct > 15) {
    triggers.push({
      code: 'RECOVERY_MODE_RECOMMENDATION',
      message: 'Drawdown exceeds 15%. Shift to recovery mode and reduce exposure.'
    });
  }

  return triggers;
}

export function normalizeTradeForAnalytics(trade) {
  return {
    id: trade.id,
    userId: trade.userId,
    symbol: trade.symbol,
    side: trade.side,
    entryPrice: toNumber(trade.entryPrice, 0),
    stopLoss: toNumber(trade.stopLoss, 0),
    takeProfit: trade.takeProfit ?? trade.exitPrice ?? null,
    riskAmount: toNumber(trade.riskAmount, 0),
    quantity: toNumber(trade.quantity, 0),
    pnl: toNumber(trade.pnl, 0),
    date: getTradeDate(trade),
    status: isClosedTrade(trade) ? 'CLOSED' : 'OPEN',
    closedAt: trade.closedAt ?? null,
    openedAt: trade.openedAt ?? null,
    rewardAmount: trade.rewardAmount != null ? toNumber(trade.rewardAmount, 0) : null,
    rMultiple: round(getTradeRMultiple(trade))
  };
}

export function validateTradeAnalyticsShape(trades = []) {
  const normalized = trades.map(normalizeTradeForAnalytics);
  return normalized.every((t) =>
    t.id != null &&
    t.userId != null &&
    typeof t.symbol === 'string' &&
    typeof t.side === 'string' &&
    typeof t.entryPrice === 'number' &&
    typeof t.stopLoss === 'number' &&
    typeof t.riskAmount === 'number' &&
    typeof t.quantity === 'number' &&
    typeof t.pnl === 'number' &&
    t.date != null &&
    (t.status === 'OPEN' || t.status === 'CLOSED')
  );
}

