import { Router } from 'express';
import { disciplineScore, equityCurve, overtrading, overtradingStatus, predictiveRisk, proHeatmap } from '../controllers/analyticsController.js';
import { requireAuth } from '../middlewares/auth.js';
import { requirePlan } from '../middlewares/requirePlan.js';

const router = Router();

router.use(requireAuth);
router.get('/equity-curve', equityCurve);
router.get('/overtrading-status', overtradingStatus);
router.get('/predictive-risk', predictiveRisk);
// Discipline score is available to all authenticated users; plan gating can be enabled later if needed.
router.get('/discipline-score', disciplineScore);
router.get('/heatmap', requirePlan(['PRO', 'ELITE']), proHeatmap);
router.get('/overtrading', requirePlan(['PRO', 'ELITE']), overtrading);

export default router;
