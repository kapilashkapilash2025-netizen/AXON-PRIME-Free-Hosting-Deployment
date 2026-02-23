import { Router } from 'express';
import { equityCurve, positionSize, setRiskSettings, snapshot } from '../controllers/riskController.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { positionSizeSchema, riskSettingSchema } from '../validators/riskValidators.js';

const router = Router();

router.post('/position-size', requireAuth, validate(positionSizeSchema), positionSize);
router.get('/snapshot', requireAuth, snapshot);
router.get('/equity-curve', requireAuth, equityCurve);
router.put('/settings', requireAuth, validate(riskSettingSchema), setRiskSettings);

export default router;
