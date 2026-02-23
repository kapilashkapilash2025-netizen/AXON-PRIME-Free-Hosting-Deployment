import { z } from 'zod';

export const positionSizeSchema = z.object({
  accountBalance: z.coerce.number().positive(),
  riskPercent: z.coerce.number().positive().max(10),
  entryPrice: z.coerce.number().positive(),
  stopLoss: z.coerce.number().positive()
});

export const riskSettingSchema = z.object({
  maxDailyLossPct: z.coerce.number().positive().max(20),
  maxRiskPerTrade: z.coerce.number().positive().max(10)
});
