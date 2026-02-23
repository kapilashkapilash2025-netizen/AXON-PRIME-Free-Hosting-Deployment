import { Router } from 'express';
import authRoutes from './authRoutes.js';
import subscriptionRoutes from './subscriptionRoutes.js';
import riskRoutes from './riskRoutes.js';
import tradeRoutes from './tradeRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/risk', riskRoutes);
router.use('/trades', tradeRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
