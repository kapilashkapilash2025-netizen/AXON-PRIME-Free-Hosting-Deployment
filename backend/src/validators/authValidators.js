import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  accountBalance: z.coerce.number().positive().max(100000000)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72)
});

export const verifySchema = z.object({
  token: z.string().min(10)
});
