import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import type { Config } from './config/env.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { rateLimit } from './middleware/rate-limit.js';
import { createApiRouter } from './routes/index.js';

const HOUR = 60 * 60 * 1000;

// Solo CORS_ORIGINS es obligatorio; lo demás tiene valores por defecto.
type AppConfig = Pick<Config, 'CORS_ORIGINS'> &
  Partial<
    Pick<
      Config,
      | 'TRUST_PROXY'
      | 'SUBMISSIONS_PER_HOUR'
      | 'SUBMISSIONS_PER_DAY'
      | 'KNOWN_CHAINS'
    >
  >;

export function createApp(config: AppConfig) {
  const app = express();

  app.disable('x-powered-by');
  if (config.TRUST_PROXY) app.set('trust proxy', config.TRUST_PROXY);
  // La web (hearteats.org) y la API (api.hearteats.org) son del mismo sitio
  // pero de distinto origen: same-site permite que la web lea las respuestas.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(
    cors({
      origin: config.CORS_ORIGINS,
      credentials: true, // la sesión de moderación va en una cookie (ADR 0007)
      methods: ['GET', 'POST', 'DELETE'],
      allowedHeaders: ['Content-Type'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: '32kb' }));

  // Un único contador para todos los envíos de la comunidad.
  const submissionLimiter = rateLimit([
    { ms: HOUR, max: config.SUBMISSIONS_PER_HOUR ?? 5 },
    { ms: 24 * HOUR, max: config.SUBMISSIONS_PER_DAY ?? 20 },
  ]);
  app.use(
    '/api/v1',
    createApiRouter({
      submissionLimiter,
      knownChains: config.KNOWN_CHAINS ?? [],
    }),
  );

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
