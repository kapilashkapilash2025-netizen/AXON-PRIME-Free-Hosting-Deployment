import { z } from 'zod';

export const tradeSchema = z.object({
  symbol: z.string().min(1).max(20),
  side: z.enum(['LONG', 'SHORT']),
  entryPrice: z.coerce.number().positive(),
  stopLoss: z.coerce.number().positive(),
  exitPrice: z.coerce.number().positive().optional().nullable(),
  quantity: z.coerce.number().positive(),
  riskAmount: z.coerce.number().positive(),
  rewardAmount: z.coerce.number().optional().nullable(),
  pnl: z.coerce.number(),
  openedAt: z.coerce.date(),
  closedAt: z.coerce.date().optional().nullable(),
  notes: z.string().max(1000).optional().nullable()
});
