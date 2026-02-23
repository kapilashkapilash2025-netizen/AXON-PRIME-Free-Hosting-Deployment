export function calcPositionSize({ accountBalance, riskPercent, entryPrice, stopLoss }) {
  const riskFraction = riskPercent / 100;
  const dollarRisk = accountBalance * riskFraction;
  const stopDistance = Math.abs(entryPrice - stopLoss);
  const positionSize = stopDistance > 0 ? dollarRisk / stopDistance : 0;
  const riskRewardRatio = stopDistance > 0 ? (stopDistance * 2) / stopDistance : 0;
  const notional = positionSize * entryPrice;
  const leverageSuggestion = accountBalance > 0 ? Math.max(1, Number((notional / accountBalance).toFixed(2))) : 1;

  return {
    positionSize: Number(positionSize.toFixed(4)),
    dollarRisk: Number(dollarRisk.toFixed(2)),
    riskRewardRatio: Number(riskRewardRatio.toFixed(2)),
    leverageSuggestion
  };
}

export function getDrawdownStatus(drawdownPct) {
  if (drawdownPct < 5) return 'SAFE';
  if (drawdownPct < 10) return 'WARNING';
  return 'CRITICAL';
}
