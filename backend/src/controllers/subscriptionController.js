import { prisma } from '../config/db.js';
import { createCheckoutSession, createPortalSession, handleStripeWebhook, refreshSubscriptionStatusForUser } from '../services/subscriptionService.js';
import { ApiError } from '../utils/apiError.js';

export async function getSubscription(req, res, next) {
  try {
    await refreshSubscriptionStatusForUser(req.user.id);
    const sub = await prisma.subscription.findUnique({ where: { userId: req.user.id } });
    res.json({ subscription: sub });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req, res, next) {
  try {
    const sub = await refreshSubscriptionStatusForUser(req.user.id);
    res.json({ subscription: sub });
  } catch (error) {
    next(error);
  }
}

export async function checkout(req, res, next) {
  try {
    const { plan } = req.body;
    if (!['PRO', 'ELITE'].includes(plan)) {
      throw new ApiError(400, 'Invalid plan. Must be PRO or ELITE');
    }
    const session = await createCheckoutSession(req.user, plan);
    res.json({ url: session.url });
  } catch (error) {
    next(error);
  }
}

export async function portal(req, res, next) {
  try {
    const session = await createPortalSession(req.user);
    res.json({ url: session.url });
  } catch (error) {
    next(error);
  }
}

export async function webhook(req, res, next) {
  try {
    const sig = req.headers['stripe-signature'];
    await handleStripeWebhook(req.body, sig);
    res.json({ received: true });
  } catch (error) {
    next(error);
  }
}
