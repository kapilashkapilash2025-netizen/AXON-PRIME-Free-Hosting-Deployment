// Sample dataset for local validation of performanceEngine metrics.
export const sampleTrades20Mixed = [
  { id: 't1', userId: 'u1', symbol: 'BTCUSDT', side: 'LONG', entryPrice: 50000, stopLoss: 49500, quantity: 0.1, riskAmount: 200, pnl: 300, rMultiple: 1.5, openedAt: '2026-02-01T09:00:00Z', closedAt: '2026-02-01T10:00:00Z' },
  { id: 't2', userId: 'u1', symbol: 'ETHUSDT', side: 'SHORT', entryPrice: 3000, stopLoss: 3060, quantity: 1, riskAmount: 200, pnl: -200, rMultiple: -1, openedAt: '2026-02-01T13:00:00Z', closedAt: '2026-02-01T13:45:00Z' },
  { id: 't3', userId: 'u1', symbol: 'BTCUSDT', side: 'LONG', entryPrice: 50500, stopLoss: 50000, quantity: 0.12, riskAmount: 220, pnl: 440, rMultiple: 2, openedAt: '2026-02-02T09:00:00Z', closedAt: '2026-02-02T11:00:00Z' },
  { id: 't4', userId: 'u1', symbol: 'SOLUSDT', side: 'LONG', entryPrice: 110, stopLoss: 107, quantity: 50, riskAmount: 150, pnl: -150, rMultiple: -1, openedAt: '2026-02-02T12:00:00Z', closedAt: '2026-02-02T12:20:00Z' },
  { id: 't5', userId: 'u1', symbol: 'ETHUSDT', side: 'LONG', entryPrice: 3100, stopLoss: 3065, quantity: 1.2, riskAmount: 180, pnl: 270, rMultiple: 1.5, openedAt: '2026-02-03T08:00:00Z', closedAt: '2026-02-03T09:30:00Z' },
  { id: 't6', userId: 'u1', symbol: 'BTCUSDT', side: 'SHORT', entryPrice: 51500, stopLoss: 52000, quantity: 0.1, riskAmount: 210, pnl: -210, rMultiple: -1, openedAt: '2026-02-03T14:00:00Z', closedAt: '2026-02-03T14:40:00Z' },
  { id: 't7', userId: 'u1', symbol: 'XAUUSD', side: 'LONG', entryPrice: 2030, stopLoss: 2022, quantity: 3, riskAmount: 240, pnl: 360, rMultiple: 1.5, openedAt: '2026-02-04T09:00:00Z', closedAt: '2026-02-04T11:00:00Z' },
  { id: 't8', userId: 'u1', symbol: 'NAS100', side: 'SHORT', entryPrice: 18000, stopLoss: 18100, quantity: 1, riskAmount: 250, pnl: -250, rMultiple: -1, openedAt: '2026-02-04T12:00:00Z', closedAt: '2026-02-04T12:35:00Z' },
  { id: 't9', userId: 'u1', symbol: 'ETHUSDT', side: 'LONG', entryPrice: 3200, stopLoss: 3160, quantity: 1.3, riskAmount: 210, pnl: 315, rMultiple: 1.5, openedAt: '2026-02-05T09:30:00Z', closedAt: '2026-02-05T10:10:00Z' },
  { id: 't10', userId: 'u1', symbol: 'BTCUSDT', side: 'LONG', entryPrice: 52000, stopLoss: 51400, quantity: 0.1, riskAmount: 230, pnl: -230, rMultiple: -1, openedAt: '2026-02-05T13:10:00Z', closedAt: '2026-02-05T13:45:00Z' },
  { id: 't11', userId: 'u1', symbol: 'SOLUSDT', side: 'LONG', entryPrice: 115, stopLoss: 112, quantity: 60, riskAmount: 180, pnl: 180, rMultiple: 1, openedAt: '2026-02-06T08:45:00Z', closedAt: '2026-02-06T09:15:00Z' },
  { id: 't12', userId: 'u1', symbol: 'XAUUSD', side: 'SHORT', entryPrice: 2040, stopLoss: 2047, quantity: 3, riskAmount: 210, pnl: -210, rMultiple: -1, openedAt: '2026-02-06T11:10:00Z', closedAt: '2026-02-06T11:30:00Z' },
  { id: 't13', userId: 'u1', symbol: 'BTCUSDT', side: 'LONG', entryPrice: 53000, stopLoss: 52350, quantity: 0.1, riskAmount: 260, pnl: 390, rMultiple: 1.5, openedAt: '2026-02-07T10:00:00Z', closedAt: '2026-02-07T12:00:00Z' },
  { id: 't14', userId: 'u1', symbol: 'ETHUSDT', side: 'SHORT', entryPrice: 3300, stopLoss: 3340, quantity: 1.2, riskAmount: 190, pnl: -190, rMultiple: -1, openedAt: '2026-02-07T13:00:00Z', closedAt: '2026-02-07T13:50:00Z' },
  { id: 't15', userId: 'u1', symbol: 'NAS100', side: 'LONG', entryPrice: 18100, stopLoss: 18020, quantity: 1, riskAmount: 220, pnl: 330, rMultiple: 1.5, openedAt: '2026-02-08T09:00:00Z', closedAt: '2026-02-08T10:20:00Z' },
  { id: 't16', userId: 'u1', symbol: 'SOLUSDT', side: 'SHORT', entryPrice: 118, stopLoss: 120.5, quantity: 50, riskAmount: 125, pnl: -125, rMultiple: -1, openedAt: '2026-02-08T11:00:00Z', closedAt: '2026-02-08T11:25:00Z' },
  { id: 't17', userId: 'u1', symbol: 'BTCUSDT', side: 'LONG', entryPrice: 53500, stopLoss: 52850, quantity: 0.11, riskAmount: 240, pnl: 480, rMultiple: 2, openedAt: '2026-02-09T09:00:00Z', closedAt: '2026-02-09T12:00:00Z' },
  { id: 't18', userId: 'u1', symbol: 'ETHUSDT', side: 'LONG', entryPrice: 3350, stopLoss: 3310, quantity: 1.1, riskAmount: 170, pnl: -170, rMultiple: -1, openedAt: '2026-02-09T13:00:00Z', closedAt: '2026-02-09T13:25:00Z' },
  { id: 't19', userId: 'u1', symbol: 'XAUUSD', side: 'LONG', entryPrice: 2050, stopLoss: 2042, quantity: 3, riskAmount: 220, pnl: 330, rMultiple: 1.5, openedAt: '2026-02-10T10:00:00Z', closedAt: '2026-02-10T11:45:00Z' },
  { id: 't20', userId: 'u1', symbol: 'SOLUSDT', side: 'LONG', entryPrice: 120, stopLoss: 117.5, quantity: 70, riskAmount: 175, pnl: 175, rMultiple: 1, openedAt: '2026-02-10T14:00:00Z', closedAt: '2026-02-10T14:30:00Z' }
];

export const sampleTrades60Win = sampleTrades20Mixed.map((trade, index) => {
  const shouldWin = index < 12;
  const risk = Number(trade.riskAmount);
  const pnl = shouldWin ? Math.abs(risk * (index % 3 === 0 ? 1 : 1.5)) : -Math.abs(risk);
  return { ...trade, pnl, rMultiple: Number((pnl / risk).toFixed(2)) };
});

export const sampleTrades30Win = sampleTrades20Mixed.map((trade, index) => {
  const shouldWin = index < 6;
  const risk = Number(trade.riskAmount);
  const pnl = shouldWin ? Math.abs(risk * (index % 2 === 0 ? 1 : 1.5)) : -Math.abs(risk);
  return { ...trade, pnl, rMultiple: Number((pnl / risk).toFixed(2)) };
});

export const sampleTradesLargeDrawdown = sampleTrades20Mixed.map((trade, index) => {
  if (index < 8) return trade;
  const pnl = index % 2 === 0 ? -Math.abs(Number(trade.riskAmount) * 1.2) : -Math.abs(Number(trade.riskAmount));
  return { ...trade, pnl, rMultiple: Number((pnl / Number(trade.riskAmount)).toFixed(2)) };
});
