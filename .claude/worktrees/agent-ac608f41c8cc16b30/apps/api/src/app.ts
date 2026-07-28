import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { publicRouter } from './routes/public.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Cabeceras de seguridad. crossOriginResourcePolicy relajado para servir
  // las imagenes /uploads a los frontends en otro puerto/origen.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // CORS restringido a los origenes del frontend/admin.
  app.use(
    cors({
      origin: (origin, cb) => {
        // Permite herramientas sin origin (curl/Postman) y los origenes whitelisted.
        if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
        cb(new Error('Origen no permitido por CORS'));
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Archivos estaticos: imagenes WebP procesadas.
  app.use('/uploads', express.static(env.uploadDirAbs, { maxAge: '7d', immutable: true }));

  // Healthcheck.
  app.get('/api/health', (_req, res) => res.json({ data: { status: 'ok', ts: Date.now() } }));

  // Rate limiting en endpoints publicos sensibles (creacion de orden, eventos).
  const publicWriteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Demasiadas solicitudes. Intenta mas tarde.' } },
  });
  app.use('/api/orders', publicWriteLimiter);
  app.use('/api/events', publicWriteLimiter);

  // Rutas.
  app.use('/api/auth', authRouter);
  app.use('/api', publicRouter);
  app.use('/api/admin', adminRouter);

  // 404 + manejo central de errores.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
