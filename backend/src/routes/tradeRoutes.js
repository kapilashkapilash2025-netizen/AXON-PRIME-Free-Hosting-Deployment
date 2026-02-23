import { Router } from 'express';
import { create, list, remove, update } from '../controllers/tradeController.js';
import { requireAuth } from '../middlewares/auth.js';
import { blockWhenDailyLocked } from '../middlewares/dailyTradingLock.js';
import { tradeWriteLimiter } from '../middlewares/rateLimiter.js';
import { validate } from '../middlewares/validate.js';
import { tradeSchema } from '../validators/tradeValidators.js';

const router = Router();

router.use(requireAuth);
router.get('/', list);
router.post('/', tradeWriteLimiter, blockWhenDailyLocked, validate(tradeSchema), create);
router.put('/:id', tradeWriteLimiter, blockWhenDailyLocked, validate(tradeSchema), update);
router.delete('/:id', tradeWriteLimiter, blockWhenDailyLocked, remove);

export default router;
