import { prisma } from '../config/db.js';
import { calculateCapitalImpactAnalytics } from '../utils/capitalImpactEngine.js';

const HOURS_24 = 24;
const MONTE_CARLO_PATHS = 300;
const FORWARD_TRADES = 5;
const LONG_HORIZON_TRADES = 30;
const MIN_CLOSED_TRADES_FOR_ACTIVATION = 3;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

function percentile(sortedAsc, p) {
  if (!sortedAsc.length) return 0;
  const idx = clamp(Math.floor((sortedAsc.length - 1) * p), 0, sortedAsc.length - 1);
  return sortedAsc[idx];
}

function stdDev(values) {
  if (!values.length) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function getUtcDayRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  return { start, end };
}

function computeWinRate(trades) {
  if (!trades.length) return 0;
  const wins = trades.filter((t) => Number(t.pnl) > 0).length;
  return (wins / trades.length) * 100;
}

function computeAvgR(trades) {
  if (!trades.length) return 0;
  const total = trades.reduce((sum, t) => sum + Number(t.rMultiple || 0), 0);
  return total / trades.length;
}

function computeAvgRiskPct(trades, referenceEquity) {
  if (!trades.length || referenceEquity <= 0) return 0;
  const totalRisk = trades.reduce((sum, t) => sum + Math.abs(Number(t.riskAmount || 0)), 0);
  return (totalRisk / trades.length / referenceEquity) * 100;
}

function computeConsecutiveLosses(closedTradesDesc) {
  let streak = 0;
  for (const trade of closedTradesDesc) {
    if (Number(trade.pnl) < 0) streak += 1;
    else break;
  }
  return streak;
}

function deriveVelocityLevel(score) {
  if (score > 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 30) return 'ELEVATED';
  return 'STABLE';
}

function projectCapitalAfterConsecutiveLosses(currentCapital, riskPerTradePct, lossesCount) {
  const capital = Math.max(Number(currentCapital || 0), 0);
  const riskPct = clamp(Number(riskPerTradePct || 0), 0, 10);
  const lossFactor = 1 - riskPct / 100;
  const projectedCapital = capital * (lossFactor ** lossesCount);
  const dropPct = capital > 0 ? ((capital - projectedCapital) / capital) * 100 : 0;

  return {
    lossesCount,
    currentCapital: round(capital),
    riskPerTradePct: round(riskPct),
    projectedCapital: round(projectedCapital),
    dropPct: round(dropPct)
  };
}

function buildCapitalStressProjection({ currentCapital, riskPerTradePct }) {
  return {
    threeLossScenario: projectCapitalAfterConsecutiveLosses(currentCapital, riskPerTradePct, 3),
    fiveLossScenario: projectCapitalAfterConsecutiveLosses(currentCapital, riskPerTradePct, 5)
  };
}

function buildRiskProjectionWarnings({ drawdownProbabilities, riskVelocityScore }) {
  const warnings = [];

  if (Number(drawdownProbabilities?.drawdown_5 || 0) > 35) {
    warnings.push({
      code: 'DRAWDOWN_5_ELEVATED',
      level: 'WARNING',
      message: 'Probability of -5% drawdown within next 5 trades is elevated.'
    });
  }

  if (Number(riskVelocityScore || 0) > 80) {
    warnings.push({
      code: 'CAPITAL_EXPOSURE_ESCALATION_DETECTED',
      level: 'CRITICAL',
      message: 'Capital exposure escalation detected.'
    });
  } else if (Number(riskVelocityScore || 0) > 65) {
    warnings.push({
      code: 'CAPITAL_EXPOSURE_ACCELERATING',
      level: 'WARNING',
      message: 'Your capital exposure is accelerating.'
    });
  }

  return warnings;
}

function buildBehavioralDegradation({ recent5, previous10, referenceEquity }) {
  if (recent5.length < 5 || previous10.length < 5) {
    return {
      status: 'INSUFFICIENT_DATA',
      flagged: false,
      severity: 'NONE',
      reasons: [],
      metrics: null
    };
  }

  const recentWinRate = computeWinRate(recent5);
  const previousWinRate = computeWinRate(previous10);
  const recentAvgR = computeAvgR(recent5);
  const previousAvgR = computeAvgR(previous10);
  const recentRiskPct = computeAvgRiskPct(recent5, referenceEquity);
  const previousRiskPct = computeAvgRiskPct(previous10, referenceEquity);

  const winRateChangePct = previousWinRate > 0 ? ((recentWinRate - previousWinRate) / previousWinRate) * 100 : 0;
  const avgRChangePct = previousAvgR !== 0 ? ((recentAvgR - previousAvgR) / Math.abs(previousAvgR)) * 100 : 0;
  const riskSizeChangePct = previousRiskPct > 0 ? ((recentRiskPct - previousRiskPct) / previousRiskPct) * 100 : 0;

  const reasons = [];
  if (previousWinRate > 0 && previousWinRate - recentWinRate > 20) {
    reasons.push('Win rate dropped more than 20% versus prior sample.');
  }
  if (previousAvgR > 0 && ((previousAvgR - recentAvgR) / Math.abs(previousAvgR)) * 100 > 15) {
    reasons.push('Average R multiple declined more than 15%.');
  }
  if (previousRiskPct > 0 && riskSizeChangePct > 30) {
    reasons.push('Risk size increased more than 30% compared with prior sample.');
  }

  const severity =
    reasons.length >= 3 ? 'HIGH' : reasons.length === 2 ? 'MODERATE' : reasons.length === 1 ? 'LOW' : 'STABLE';

  return {
    status: 'READY',
    flagged: reasons.length > 0,
    severity,
    reasons,
    metrics: {
      recent5WinRate: round(recentWinRate),
      previous10WinRate: round(previousWinRate),
      recent5AvgR: round(recentAvgR),
      previous10AvgR: round(previousAvgR),
      recent5AvgRiskPct: round(recentRiskPct),
      previous10AvgRiskPct: round(previousRiskPct),
      winRateChangePct: round(winRateChangePct),
      avgRChangePct: round(avgRChangePct),
      riskSizeChangePct: round(riskSizeChangePct)
    }
  };
}

function buildBehavioralStabilityIndicator(degradation) {
  if (!degradation || degradation.status !== 'READY' || !degradation.metrics) {
    return {
      status: 'BASELINE_BUILDING',
      label: 'Baseline Building',
      tone: 'NEUTRAL',
      winRateChangePct: null,
      avgRChangePct: null,
      riskSizeChangePct: null
    };
  }

  const metrics = degradation.metrics;
  let status = 'STABLE';
  let label = 'Stable';
  let tone = 'GREEN';

  if (degradation.severity === 'HIGH') {
    status = 'DEGRADING';
    label = 'Degrading';
    tone = 'RED';
  } else if (degradation.flagged) {
    status = 'WEAKENING';
    label = 'Weakening';
    tone = 'AMBER';
  }

  return {
    status,
    label,
    tone,
    winRateChangePct: metrics.winRateChangePct,
    avgRChangePct: metrics.avgRChangePct,
    riskSizeChangePct: metrics.riskSizeChangePct
  };
}

function createRng(seedNumber) {
  let seed = Math.floor(Math.abs(seedNumber)) % 2147483647;
  if (seed <= 0) seed += 2147483646;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function estimateDrawdownProbabilities({ winRatePct, avgR, avgRiskPct, consecutiveLosses, degradationFlag, sampleSize }) {
  const riskPct = clamp(avgRiskPct / 100, 0.001, 0.05);
  const baseWinProb = clamp(winRatePct / 100, 0.1, 0.9);
  const streakPenalty = clamp(consecutiveLosses * 0.03, 0, 0.12);
  const degradationPenalty = degradationFlag ? 0.05 : 0;
  const winProb = clamp(baseWinProb - streakPenalty - degradationPenalty, 0.08, 0.9);
  const rewardR = clamp(avgR > 0 ? avgR : 1, 0.3, 3.5);

  let hit3 = 0;
  let hit5 = 0;
  let hit8 = 0;
  const worstDrawdowns = [];
  const finalReturns = [];

  const rng = createRng(Date.now() + sampleSize);
  for (let p = 0; p < MONTE_CARLO_PATHS; p += 1) {
    let cumulativeReturnPct = 0;
    let worstDrawdownPct = 0;

    for (let t = 0; t < FORWARD_TRADES; t += 1) {
      const isWin = rng() < winProb;
      if (isWin) cumulativeReturnPct += riskPct * rewardR * 100;
      else cumulativeReturnPct -= riskPct * 100;
      worstDrawdownPct = Math.min(worstDrawdownPct, cumulativeReturnPct);
    }

    const absWorst = Math.abs(worstDrawdownPct);
    worstDrawdowns.push(absWorst);
    finalReturns.push(cumulativeReturnPct);
    if (absWorst >= 3) hit3 += 1;
    if (absWorst >= 5) hit5 += 1;
    if (absWorst >= 8) hit8 += 1;
  }

  const sortedWorst = [...worstDrawdowns].sort((a, b) => a - b);
  const sortedReturns = [...finalReturns].sort((a, b) => a - b);
  const meanFinalReturn = finalReturns.reduce((sum, v) => sum + v, 0) / Math.max(finalReturns.length, 1);
  const varianceStd = stdDev(finalReturns);

  // Confidence heuristic based on sample size and distribution stability. Kept explicit in service layer.
  const sampleConfidence = clamp((sampleSize / 20) * 100, 20, 85);
  const stabilityPenalty = clamp(varianceStd * 2.5, 0, 20);
  const confidenceBandPct = round(clamp(sampleConfidence - stabilityPenalty + 10, 15, 95));

  return {
    drawdown_3: round((hit3 / MONTE_CARLO_PATHS) * 100),
    drawdown_5: round((hit5 / MONTE_CARLO_PATHS) * 100),
    drawdown_8: round((hit8 / MONTE_CARLO_PATHS) * 100),
    assumptions: {
      projectedTrades: FORWARD_TRADES,
      winProbabilityUsed: round(winProb * 100),
      avgRUsed: round(rewardR),
      avgRiskPctUsed: round(riskPct * 100)
    },
    projectionStats: {
      expectedCapitalVariancePct: round(varianceStd),
      expectedReturnPct: round(meanFinalReturn),
      estimatedWorstCaseDrawdownPct: round(percentile(sortedWorst, 0.95)),
      confidenceBandPct
    }
  };
}

function estimateLongHorizonCapitalRisk({
  winRatePct,
  avgR,
  avgRiskPct,
  consecutiveLosses,
  degradationFlag,
  sampleSize,
  horizonTrades = LONG_HORIZON_TRADES
}) {
  const riskPct = clamp(avgRiskPct / 100, 0.001, 0.06);
  const baseWinProb = clamp(winRatePct / 100, 0.08, 0.9);
  const streakPenalty = clamp(consecutiveLosses * 0.025, 0, 0.15);
  const degradationPenalty = degradationFlag ? 0.06 : 0;
  const winProb = clamp(baseWinProb - streakPenalty - degradationPenalty, 0.05, 0.9);
  const rewardR = clamp(avgR > 0 ? avgR : 0.6, 0.2, 3.5);

  const paths = Math.max(MONTE_CARLO_PATHS + 100, 400);
  let hitDd20 = 0;
  let hitDecline30 = 0;
  let hitRuin = 0;
  const finalReturnPcts = [];
  const worstDrawdowns = [];
  const rng = createRng(Date.now() + sampleSize + horizonTrades * 31);

  for (let p = 0; p < paths; p += 1) {
    let cumulativeReturnPct = 0;
    let peakReturnPct = 0;
    let worstDrawdownPct = 0;

    for (let t = 0; t < horizonTrades; t += 1) {
      const isWin = rng() < winProb;
      cumulativeReturnPct += isWin ? riskPct * rewardR * 100 : -(riskPct * 100);
      peakReturnPct = Math.max(peakReturnPct, cumulativeReturnPct);
      worstDrawdownPct = Math.min(worstDrawdownPct, cumulativeReturnPct - peakReturnPct);
    }

    const absWorstDd = Math.abs(worstDrawdownPct);
    const capitalDeclinePct = Math.max(0, -cumulativeReturnPct);

    if (absWorstDd >= 20) hitDd20 += 1;
    if (capitalDeclinePct >= 30) hitDecline30 += 1;
    // Risk of ruin proxy threshold for capital-protection context: 50% decline from current capital.
    if (capitalDeclinePct >= 50) hitRuin += 1;

    worstDrawdowns.push(absWorstDd);
    finalReturnPcts.push(cumulativeReturnPct);
  }

  const sortedWorst = [...worstDrawdowns].sort((a, b) => a - b);
  const varianceStd = stdDev(finalReturnPcts);
  const sampleConfidence = clamp((sampleSize / 30) * 100, 25, 90);
  const confidenceBandPct = round(clamp(sampleConfidence - varianceStd * 1.5 + 8, 15, 95));

  return {
    horizonTrades,
    probabilityDrawdown20Pct: round((hitDd20 / paths) * 100),
    probabilityCapitalDecline30Pct: round((hitDecline30 / paths) * 100),
    riskOfRuinPct: round((hitRuin / paths) * 100),
    expectedCapitalVariancePct: round(varianceStd),
    estimatedWorstCaseDrawdownPct: round(percentile(sortedWorst, 0.95)),
    confidenceBandPct,
    assumptions: {
      winProbabilityUsed: round(winProb * 100),
      avgRUsed: round(rewardR),
      avgRiskPctUsed: round(riskPct * 100)
    }
  };
}

function getForwardProjectionSummary({ drawdownProbabilities, metrics }) {
  const dd5 = Number(drawdownProbabilities.drawdown_5 || 0);
  const winRate = Number(metrics.rollingWinRate5 || 0);
  const avgR = Number(metrics.averageRMultiple || 0);
  const riskPerTrade = Number(metrics.riskPerTradePct || 0);
  const frequency = Number(metrics.tradeFrequencyPerHour || 0);

  return `Based on your last 5 trades, there is a ${dd5}% probability of a -5% drawdown within the next 5 trades if current behavior continues. Current profile: ${winRate}% rolling win rate, ${avgR} avg R, ${riskPerTrade}% risk per trade, and ${frequency} trades/hour.`;
}

function buildEmptyPredictiveResponse(status, closedTradeCount) {
  return {
    status,
    activation: {
      minClosedTrades: MIN_CLOSED_TRADES_FOR_ACTIVATION,
      closedTradesCount: closedTradeCount
    },
    metrics: {
      rollingWinRate5: null,
      averageRMultiple: null,
      riskPerTradePct: null,
      tradeFrequencyPerHour: null,
      consecutiveLosses: null,
      capitalExposureRatio: null,
      tradesToday: null,
      sampleSizeClosedTrades: closedTradeCount
    },
    riskVelocityScore: null,
    riskVelocityLevel: null,
    riskVelocity: {
      score: null,
      level: null,
      label: 'Capital Acceleration Index',
      components: { riskPerTradePct: null, tradeFrequencyPerHour: null, capitalExposureRatio: null }
    },
    drawdownProbabilities: null,
    drawdownProbability: null,
    behavioralStability: {
      status: 'BASELINE_BUILDING',
      label: 'Baseline Building',
      tone: 'NEUTRAL',
      winRateChangePct: null,
      avgRChangePct: null,
      riskSizeChangePct: null
    },
    behavioralDegradation: {
      status: 'INSUFFICIENT_DATA',
      flagged: false,
      severity: 'NONE',
      reasons: [],
      metrics: null
    },
    aiRiskExplanation:
      'Log at least 3 closed trades to activate predictive analytics. AXON PRIME models capital risk velocity and drawdown probability using behavioral pattern recognition.',
    forwardProjection: {
      horizonTrades: FORWARD_TRADES,
      summary:
        'Log at least 3 closed trades to activate predictive analytics. AXON PRIME models capital risk velocity and drawdown probability using behavioral pattern recognition.',
      expectedCapitalVariancePct: null,
      estimatedWorstCaseDrawdownPct: null,
      confidenceBandPct: null
    },
    capitalStressProjection: null,
    capitalImpact: null,
    longHorizonRiskProjection: null,
    riskProjectionWarnings: [],
    alerts: []
  };
}

export async function getPredictiveRiskIntelligence(userId) {
  const { start, end } = getUtcDayRange();
  const last24hStart = new Date(Date.now() - HOURS_24 * 60 * 60 * 1000);

  const [user, closedTrades, last24hTrades, openTrades] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { accountBalance: true, currentEquity: true }
    }),
    prisma.trade.findMany({
      where: { userId, closedAt: { not: null } },
      orderBy: { closedAt: 'asc' },
      select: {
        pnl: true,
        rMultiple: true,
        riskAmount: true,
        quantity: true,
        entryPrice: true,
        closedAt: true,
        createdAt: true
      }
    }),
    prisma.trade.findMany({
      where: { userId, createdAt: { gte: last24hStart } },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true }
    }),
    prisma.trade.findMany({
      where: { userId, closedAt: null },
      select: { entryPrice: true, quantity: true }
    })
  ]);

  const closedTradeCount = closedTrades.length;
  if (closedTradeCount === 0) return buildEmptyPredictiveResponse('NO_DATA', 0);
  if (closedTradeCount < MIN_CLOSED_TRADES_FOR_ACTIVATION) {
    return buildEmptyPredictiveResponse('INSUFFICIENT_DATA', closedTradeCount);
  }

  const accountBalance = Number(user?.accountBalance || 0);
  const currentEquity = Number(user?.currentEquity || user?.accountBalance || 0);
  const equityRef = Math.max(currentEquity, accountBalance, 1);

  const closedTradesDesc = [...closedTrades].sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime());
  const recent5 = closedTradesDesc.slice(0, 5);
  const previous10 = closedTradesDesc.slice(5, 15);
  const recent20 = closedTradesDesc.slice(0, 20);
  const recentForMetrics = recent20.length ? recent20 : closedTradesDesc;

  const rollingWinRate5 = computeWinRate(recent5);
  const averageRMultiple = computeAvgR(recentForMetrics);
  const riskPerTradePct = computeAvgRiskPct(recentForMetrics, equityRef);
  const tradeFrequencyPerHour = last24hTrades.length / HOURS_24;
  const consecutiveLosses = computeConsecutiveLosses(closedTradesDesc);
  const totalOpenExposure = openTrades.reduce(
    (sum, t) => sum + Math.abs(Number(t.entryPrice || 0) * Number(t.quantity || 0)),
    0
  );
  const capitalExposureRatio = (totalOpenExposure / equityRef) * 100;

  const rawVelocity = (riskPerTradePct / 100) * tradeFrequencyPerHour * (capitalExposureRatio / 100);
  const riskVelocityScore = clamp(Math.round(rawVelocity * 10000), 0, 100);
  const riskVelocityLevel = deriveVelocityLevel(riskVelocityScore);

  const metrics = {
    rollingWinRate5: round(rollingWinRate5),
    averageRMultiple: round(averageRMultiple),
    riskPerTradePct: round(riskPerTradePct),
    tradeFrequencyPerHour: round(tradeFrequencyPerHour),
    consecutiveLosses,
    capitalExposureRatio: round(capitalExposureRatio),
    tradesToday: last24hTrades.filter((t) => new Date(t.createdAt) >= start && new Date(t.createdAt) <= end).length,
    sampleSizeClosedTrades: closedTradeCount
  };

  const behavioralDegradation = buildBehavioralDegradation({ recent5, previous10, referenceEquity: equityRef });
  const behavioralStability = buildBehavioralStabilityIndicator(behavioralDegradation);

  const drawdownProbabilities = estimateDrawdownProbabilities({
    winRatePct: metrics.rollingWinRate5 || computeWinRate(closedTradesDesc.slice(0, 10)),
    avgR: metrics.averageRMultiple,
    avgRiskPct: metrics.riskPerTradePct || 0.5,
    consecutiveLosses,
    degradationFlag: behavioralDegradation.flagged,
    sampleSize: closedTradeCount
  });

  const alerts = [];
  if (Number(drawdownProbabilities.drawdown_5) > 40) {
    alerts.push({ code: 'ELEVATED_DRAWDOWN_RISK', level: 'WARNING', message: 'Elevated Drawdown Risk' });
  }
  if (riskVelocityScore > 75) {
    alerts.push({ code: 'CAPITAL_EXPOSURE_ESCALATING', level: 'CRITICAL', message: 'Capital Exposure Escalating' });
  }

  const aiRiskExplanation = getForwardProjectionSummary({ drawdownProbabilities, metrics });
  const capitalStressProjection = buildCapitalStressProjection({
    currentCapital: currentEquity || accountBalance,
    riskPerTradePct: metrics.riskPerTradePct
  });
  const capitalImpact = calculateCapitalImpactAnalytics({
    closedTrades,
    currentEquity,
    accountBalance
  });
  const longHorizonRiskProjection = estimateLongHorizonCapitalRisk({
    winRatePct: metrics.rollingWinRate5 || computeWinRate(closedTradesDesc.slice(0, 10)),
    avgR: metrics.averageRMultiple,
    avgRiskPct: metrics.riskPerTradePct || 0.5,
    consecutiveLosses,
    degradationFlag: behavioralDegradation.flagged,
    sampleSize: closedTradeCount,
    horizonTrades: LONG_HORIZON_TRADES
  });
  const riskProjectionWarnings = buildRiskProjectionWarnings({
    drawdownProbabilities,
    riskVelocityScore
  });

  if (Number(longHorizonRiskProjection?.probabilityCapitalDecline30Pct || 0) > 40) {
    alerts.push({
      code: 'HIGH_CAPITAL_COLLAPSE_RISK',
      level: 'CRITICAL',
      message: 'High Capital Collapse Risk Detected'
    });
  }

  return {
    status: 'READY',
    activation: {
      minClosedTrades: MIN_CLOSED_TRADES_FOR_ACTIVATION,
      closedTradesCount: closedTradeCount
    },
    metrics,
    riskVelocityScore,
    riskVelocityLevel,
    riskVelocity: {
      score: riskVelocityScore,
      level: riskVelocityLevel,
      label: 'Capital Acceleration Index',
      components: {
        riskPerTradePct: metrics.riskPerTradePct,
        tradeFrequencyPerHour: metrics.tradeFrequencyPerHour,
        capitalExposureRatio: metrics.capitalExposureRatio
      }
    },
    drawdownProbabilities,
    drawdownProbability: drawdownProbabilities,
    behavioralStability,
    behavioralDegradation,
    aiRiskExplanation,
    forwardProjection: {
      horizonTrades: FORWARD_TRADES,
      summary: aiRiskExplanation,
      expectedCapitalVariancePct: drawdownProbabilities.projectionStats.expectedCapitalVariancePct,
      estimatedWorstCaseDrawdownPct: drawdownProbabilities.projectionStats.estimatedWorstCaseDrawdownPct,
      confidenceBandPct: drawdownProbabilities.projectionStats.confidenceBandPct,
      expectedReturnPct: drawdownProbabilities.projectionStats.expectedReturnPct
    },
    capitalStressProjection,
    capitalImpact,
    longHorizonRiskProjection,
    riskProjectionWarnings,
    alerts
  };
}
