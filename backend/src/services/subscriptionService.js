import Stripe from 'stripe';
import { Plan, SubscriptionStatus } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../config/db.js';
import { ApiError } from '../utils/apiError.js';
import { isFounder } from '../utils/featureAccess.js';

let stripeClient;

function isPlaceholder(value = '') {
  return String(value).includes('xxx');
}

function getStripeClient() {
  if (!env.stripeSecretKey || isPlaceholder(env.stripeSecretKey) || !env.stripeSecretKey.startsWith('sk_')) {
    throw new ApiError(503, 'Billing is temporarily unavailable.');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(env.stripeSecretKey);
  }

  return stripeClient;
}

function assertStripePricingConfig() {
  if (!env.stripePricePro || !env.stripePriceElite || isPlaceholder(env.stripePricePro) || isPlaceholder(env.stripePriceElite)) {
    throw new ApiError(503, 'Billing plan configuration is incomplete.');
  }
}

function mapPriceToPlan(priceId) {
  if (priceId === env.stripePricePro) return Plan.PRO;
  if (priceId === env.stripePriceElite) return Plan.ELITE;
  return Plan.FREE;
}

function mapStripeStatus(status) {
  switch (status) {
    case 'active':
      return SubscriptionStatus.ACTIVE;
    case 'past_due':
      return SubscriptionStatus.PAST_DUE;
    case 'incomplete':
      return SubscriptionStatus.INCOMPLETE;
    case 'canceled':
      return SubscriptionStatus.CANCELED;
    default:
      return SubscriptionStatus.INACTIVE;
  }
}

function mapStripeError(error) {
  if (!error) return new ApiError(502, 'Billing service request failed.');

  if (error.type === 'StripeAuthenticationError' || error.type === 'StripePermissionError') {
    return new ApiError(503, 'Billing service authentication failed.');
  }
  if (error.type === 'StripeRateLimitError') {
    return new ApiError(429, 'Billing service is busy. Please retry shortly.');
  }
  if (error.type === 'StripeInvalidRequestError') {
    return new ApiError(400, 'Billing request is invalid.');
  }

  return new ApiError(502, 'Billing service request failed.');
}

async function applySubscriptionState(dbSub, stripeSubscription) {
  const priceId = stripeSubscription.items.data[0]?.price?.id;
  const plan = mapPriceToPlan(priceId);
  const status = mapStripeStatus(stripeSubscription.status);
  const user = await prisma.user.findUnique({ where: { id: dbSub.userId }, select: { role: true } });

  const tx = [
    prisma.subscription.update({
      where: { id: dbSub.id },
      data: {
        stripeSubscriptionId: stripeSubscription.id,
        plan,
        status,
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000)
      }
    })
  ];

  if (!isFounder(user)) {
    tx.push(prisma.user.update({ where: { id: dbSub.userId }, data: { role: plan } }));
  }

  await prisma.$transaction(tx);
}

export async function ensureStripeCustomer(user) {
  const stripe = getStripeClient();

  const existingSub = await prisma.subscription.findUnique({ where: { userId: user.id } });
  if (existingSub?.stripeCustomerId) return existingSub.stripeCustomerId;

  let customer;
  try {
    customer = await stripe.customers.create({ email: user.email, name: user.fullName, metadata: { userId: user.id } });
  } catch (error) {
    throw mapStripeError(error);
  }

  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: { stripeCustomerId: customer.id },
    create: {
      userId: user.id,
      stripeCustomerId: customer.id,
      plan: Plan.FREE,
      status: SubscriptionStatus.INACTIVE
    }
  });

  return customer.id;
}

export async function createCheckoutSession(user, plan) {
  const stripe = getStripeClient();
  assertStripePricingConfig();

  const priceId = plan === 'PRO' ? env.stripePricePro : env.stripePriceElite;
  if (!priceId) throw new ApiError(400, 'Invalid billing plan selected.');

  const customerId = await ensureStripeCustomer(user);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${env.appUrl}/dashboard?checkout=success`,
      cancel_url: `${env.appUrl}/dashboard?checkout=cancel`
    });

    if (!session.url || !session.url.startsWith('https://checkout.stripe.com/')) {
      throw new ApiError(502, 'Invalid checkout session URL.');
    }

    return session;
  } catch (error) {
    throw error instanceof ApiError ? error : mapStripeError(error);
  }
}

export async function createPortalSession(user) {
  const stripe = getStripeClient();
  const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
  if (!sub?.stripeCustomerId) throw new ApiError(404, 'Billing profile not found.');

  try {
    return await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${env.appUrl}/dashboard`
    });
  } catch (error) {
    throw mapStripeError(error);
  }
}

export async function handleStripeWebhook(payload, sig) {
  const stripe = getStripeClient();
  if (!env.stripeWebhookSecret || isPlaceholder(env.stripeWebhookSecret)) {
    throw new ApiError(503, 'Billing webhook is not configured.');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, env.stripeWebhookSecret);
  } catch {
    throw new ApiError(400, 'Invalid webhook signature.');
  }

  if (event.type === 'checkout.session.completed' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
    const subObj = event.data.object;
    const stripeSubId = subObj.subscription || subObj.id;

    const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubId, {
      expand: ['items.data.price', 'customer']
    });

    const customerId = typeof stripeSubscription.customer === 'string' ? stripeSubscription.customer : stripeSubscription.customer.id;

    const dbSub = await prisma.subscription.findFirst({ where: { stripeCustomerId: customerId } });
    if (!dbSub) return event;

    await applySubscriptionState(dbSub, stripeSubscription);
  }

  if (event.type === 'customer.subscription.deleted') {
    const stripeSubscription = event.data.object;
    const dbSub = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: stripeSubscription.id } });
    if (!dbSub) return event;

    await prisma.subscription.update({
      where: { id: dbSub.id },
      data: { status: SubscriptionStatus.CANCELED, plan: Plan.FREE }
    });
    const user = await prisma.user.findUnique({ where: { id: dbSub.userId }, select: { role: true } });
    if (!isFounder(user)) {
      await prisma.user.update({ where: { id: dbSub.userId }, data: { role: Plan.FREE } });
    }
  }

  return event;
}

export async function refreshSubscriptionStatusForUser(userId) {
  const dbSub = await prisma.subscription.findUnique({ where: { userId } });
  let stripe;

  try {
    stripe = getStripeClient();
  } catch {
    return dbSub;
  }

  if (!dbSub?.stripeSubscriptionId) {
    return dbSub;
  }

  try {
    const stripeSubscription = await stripe.subscriptions.retrieve(dbSub.stripeSubscriptionId, {
      expand: ['items.data.price']
    });
    await applySubscriptionState(dbSub, stripeSubscription);
    return prisma.subscription.findUnique({ where: { userId } });
  } catch (error) {
    if (error.type === 'StripeInvalidRequestError') {
      const user = await prisma.user.findUnique({ where: { id: dbSub.userId }, select: { role: true } });
      const tx = [
        prisma.subscription.update({
          where: { id: dbSub.id },
          data: { status: SubscriptionStatus.CANCELED, plan: Plan.FREE }
        })
      ];
      if (!isFounder(user)) {
        tx.push(prisma.user.update({ where: { id: dbSub.userId }, data: { role: Plan.FREE } }));
      }
      await prisma.$transaction(tx);
      return prisma.subscription.findUnique({ where: { userId } });
    }
    throw mapStripeError(error);
  }
}
