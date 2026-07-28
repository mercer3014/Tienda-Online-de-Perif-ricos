import { Router, type Router as RouterType } from 'express';
import rateLimit from 'express-rate-limit';
import { loginSchema } from '@villano/shared-types';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, ok } from '../../lib/http.js';
import { requireAuth, getAuth } from '../../middleware/auth.js';
import { getMe, login } from './auth.service.js';

// Rate limit especifico para login (mitiga fuerza bruta).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Demasiados intentos. Espera unos minutos.' } },
});

export const authRouter: RouterType = Router();

authRouter.post(
  '/login',
  loginLimiter,
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => ok(res, await login(req.body))),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => ok(res, await getMe(getAuth(req).userId))),
);
