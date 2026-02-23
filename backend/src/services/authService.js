import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { ApiError } from '../utils/apiError.js';
import { randomToken, signJwt } from '../utils/tokens.js';
import { sendVerificationEmail } from './emailService.js';
import { refreshSubscriptionStatusForUser } from './subscriptionService.js';

export async function registerUser({ fullName, email, password, accountBalance }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(409, 'Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      passwordHash,
      accountBalance,
      currentEquity: accountBalance,
      equityPeak: accountBalance,
      riskSetting: { create: {} },
      subscription: { create: {} }
    }
  });

  const token = randomToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
    }
  });

  await sendVerificationEmail(user.email, token);

  return user;
}

export async function verifyEmail(token) {
  const record = await prisma.emailVerificationToken.findUnique({ where: { token } });
  if (!record || record.verifiedAt || record.expiresAt < new Date()) {
    throw new ApiError(400, 'Invalid or expired token');
  }

  await prisma.$transaction([
    prisma.emailVerificationToken.update({ where: { id: record.id }, data: { verifiedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } })
  ]);
}

export async function loginUser({ email, password }) {
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw new ApiError(401, 'Invalid credentials');
  }

  if (!user.emailVerified) {
    throw new ApiError(403, 'Please verify your email before login');
  }

  // Keep role and billing status fresh for every login without blocking auth flow.
  try {
    await refreshSubscriptionStatusForUser(user.id);
    user = await prisma.user.findUnique({ where: { id: user.id } });
  } catch {
    // Billing refresh failures should not block login.
  }

  const token = signJwt({ sub: user.id, role: user.role, email: user.email });
  return { token, user };
}
