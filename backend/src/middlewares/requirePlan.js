import { prisma } from '../config/db.js';
import { hasAccess, isFounder } from '../utils/featureAccess.js';

export const requirePlan = (plans) => async (req, res, next) => {
  const hasAnyPlanAccess = plans.some((plan) => hasAccess(req.user, plan));
  if (!hasAnyPlanAccess) {
    return res.status(403).json({ message: `Requires ${plans.join(' or ')} plan.` });
  }

  if (isFounder(req.user)) {
    return next();
  }

  if (req.user.role === 'FREE') {
    return res.status(403).json({ message: 'Active paid subscription required.' });
  }

  const sub = await prisma.subscription.findUnique({ where: { userId: req.user.id } });
  const validStatuses = ['ACTIVE', 'PAST_DUE'];

  if (!sub || !validStatuses.includes(sub.status)) {
    return res.status(403).json({ message: 'Subscription is not active.' });
  }

  return next();
};
