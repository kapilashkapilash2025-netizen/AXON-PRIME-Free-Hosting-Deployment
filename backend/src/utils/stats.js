export function calculateTradeStats(trades) {
  const total = trades.length;
  let wins = 0;
  let grossProfit = 0;
  let grossLossAbs = 0;
  let totalR = 0;

  for (const trade of trades) {
    const pnl = Number(trade.pnl);
    const r = Number(trade.rMultiple);

    if (pnl > 0) {
      wins += 1;
      grossProfit += pnl;
    } else if (pnl < 0) {
      grossLossAbs += Math.abs(pnl);
    }
    totalR += r;
  }

  const avgR = total ? totalR / total : 0;
  const profitFactor = grossLossAbs > 0 ? grossProfit / grossLossAbs : grossProfit > 0 ? 999 : 0;

  return {
    totalTrades: total,
    winRate: total ? Number(((wins / total) * 100).toFixed(2)) : 0,
    avgRMultiple: Number(avgR.toFixed(2)),
    profitFactor: Number(profitFactor.toFixed(2))
  };
}
