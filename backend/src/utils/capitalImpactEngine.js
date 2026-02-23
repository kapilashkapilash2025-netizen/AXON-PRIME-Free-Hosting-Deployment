function toNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round(value, digits = 2) {
  return Number(toNum(value, 0).toFixed(digits));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getTimeMs(trade) {
  const date = trade?.closedAt || trade?.createdAt || trade?.openedAt;
  const ts = new Date(date).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function getRiskPct(trade, equityRef) {
  const riskAmount = Math.abs(toNum(trade?.riskAmount, 0));
  return equityRef > 0 ? (riskAmount / equityRef) * 100 : 0;
}

function flagEmotionalDeviationTrades(closedTradesAsc, equityRef) {
  const flags = [];
  let rollingLossStreak = 0;

  for (let i = 0; i < closedTradesAsc.length; i += 1) {
    const trade = closedTradesAsc[i];
    const pnl = toNum(trade.pnl, 0);
    const reasons = [];
    const riskPct = getRiskPct(trade, equityRef);

    if (pnl < 0) rollingLossStreak += 1;
    else rollingLossStreak = 0;

    if (rollingLossStreak >= 3) reasons.push('LOSS_STREAK_ESCALATION');
    if (riskPct > 3) reasons.push('HIGH_RISK_SIZING');

    if (i > 0) {
      const prev = closedTradesAsc[i - 1];
      const minutesBetween = (getTimeMs(trade) - getTimeMs(prev)) / 60000;
      if (minutesBetween >= 0 && minutesBetween < 10) reasons.push('RAPID_REENTRY');

      if (pnl < 0 && toNum(prev.pnl, 0) < 0 && toNum(trade.riskAmount, 0) > toNum(prev.riskAmount, 0) * 1.1) {
        reasons.push('RISK_ESCALATION_AFTER_LOSS');
      }
    }

    if (reasons.length) {
      flags.push({
        tradeId: trade.id,
        symbol: trade.symbol,
        pnl: round(pnl),
        riskAmount: round(toNum(trade.riskAmount, 0)),
        riskPct: round(riskPct),
        reasons
      });
    }
  }

  return flags;
}

// Heuristic-but-math-based capital impact model using observed deviation losses and behavior severity.
export function calculateCapitalImpactAnalytics({ closedTrades = [], currentEquity = 0, accountBalance = 0 }) {
  const equityRef = Math.max(toNum(currentEquity, 0), toNum(accountBalance, 0), 1);
  const sorted = [...closedTrades].sort((a, b) => getTimeMs(a) - getTimeMs(b));
  const flagged = flagEmotionalDeviationTrades(sorted, equityRef);

  const flaggedIds = new Set(flagged.map((f) => f.tradeId));
  const emotionalLossAbs = sorted.reduce((sum, trade) => {
    if (!flaggedIds.has(trade.id)) return sum;
    const pnl = toNum(trade.pnl, 0);
    return sum + (pnl < 0 ? Math.abs(pnl) : 0);
  }, 0);

  const flaggedCount = flagged.length;
  const flaggedLossTrades = flagged.filter((f) => f.pnl < 0).length;
  const severeFlags = flagged.reduce((sum, f) => sum + (f.reasons.includes('LOSS_STREAK_ESCALATION') || f.reasons.includes('RISK_ESCALATION_AFTER_LOSS') ? 1 : 0), 0);

  // Savings estimate is an explicit guard-effect heuristic based on observed deviation severity and count.
  const preventableLossRatio = clamp(
    0.25 + (flaggedLossTrades / Math.max(sorted.length, 1)) * 0.4 + (severeFlags / Math.max(flaggedCount, 1)) * 0.15,
    0,
    0.75
  );

  const potentialAvoidedLoss = emotionalLossAbs * preventableLossRatio;

  let periodDays = 30;
  if (sorted.length >= 2) {
    const spanMs = Math.max(getTimeMs(sorted[sorted.length - 1]) - getTimeMs(sorted[0]), 0);
    periodDays = Math.max(spanMs / 86400000, 1);
  }
  const monthlyRiskLeakagePct = equityRef > 0 ? ((emotionalLossAbs / equityRef) * (30 / periodDays)) * 100 : 0;

  return {
    emotionalDeviationTradesCount: flaggedCount,
    emotionalLossTradesCount: flaggedLossTrades,
    capitalLostDueToEmotionalTrades: round(emotionalLossAbs),
    potentialAvoidedLossWithPredictiveEngine: round(potentialAvoidedLoss),
    monthlyRiskLeakagePct: round(monthlyRiskLeakagePct),
    preventableLossRatioPct: round(preventableLossRatio * 100),
    breakdown: flagged.slice(-8),
    messages: {
      loss: `You lost $${round(emotionalLossAbs).toLocaleString()} due to emotional deviation.`,
      avoided: `With Predictive Engine, you could have saved $${round(potentialAvoidedLoss).toLocaleString()}.`
    }
  };
}

