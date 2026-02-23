import { Router } from 'express';
import { login, me, register, verify } from '../controllers/authController.js';
import { requireAuth } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { validate } from '../middlewares/validate.js';
import { loginSchema, registerSchema, verifySchema } from '../validators/authValidators.js';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.get('/verify-email', validate(verifySchema, 'query'), verify);
router.get('/me', requireAuth, me);

export default router;
