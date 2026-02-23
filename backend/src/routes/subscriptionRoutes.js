import express, { Router } from 'express';
import { checkout, getSubscription, portal, refresh, webhook } from '../controllers/subscriptionController.js';
import { requireAuth } from '../middlewares/auth.js';
import { billingLimiter } from '../middlewares/rateLimiter.js';
import { validate } from '../middlewares/validate.js';
import { z } from 'zod';

const router = Router();

router.post('/webhook', express.raw({ type: 'application/json' }), webhook);
router.get('/', requireAuth, getSubscription);
router.post('/refresh', requireAuth, billingLimiter, refresh);
router.post('/checkout', requireAuth, billingLimiter, validate(z.object({ plan: z.enum(['PRO', 'ELITE']) })), checkout);
router.post('/portal', requireAuth, billingLimiter, portal);

export default router;
