import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import type { Config } from './config/env.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { apiRouter } from './routes/index.js';

export function createApp(config: Pick<Config, 'CORS_ORIGINS'>) {
  const app = express();

  app.disable('x-powered-by');
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

  app.use('/api/v1', apiRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
