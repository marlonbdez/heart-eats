import { randomBytes } from 'node:crypto';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import type { Config } from './config/env.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { createRateLimiter } from './middleware/rate-limit.js';
import { createApiRouter } from './routes/index.js';
import type { Geocoder } from './services/geocoder.js';
import { consoleMailer, type Mailer } from './services/mailer.js';

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
      | 'NODE_ENV'
      | 'WEB_URL'
      | 'REPLY_TOKEN_SECRET'
    >
  >;

// Solicitudes de enlace de acceso por IP y hora. Moderan pocas personas, así
// que el tope es bajo; el límite por persona está en la ruta.
const LOGIN_LINKS_PER_HOUR = 20;

interface AppDeps {
  mailer?: Mailer;
  // Sin geocodificador (como en las pruebas), no se geocodifica.
  geocoder?: Geocoder;
}

export function createApp(
  config: AppConfig,
  { mailer, geocoder }: AppDeps = {},
) {
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
      // La cabecera propia la exigen las escrituras con sesión (ADR 0007).
      allowedHeaders: ['Content-Type', 'X-Requested-With'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: '32kb' }));

  // Un único contador para todos los envíos de la comunidad. Sin valor (como
  // en las pruebas) no hay límite; en el servidor los fija la configuración.
  const submissionLimiter = createRateLimiter([
    { ms: HOUR, max: config.SUBMISSIONS_PER_HOUR ?? 0 },
    { ms: 24 * HOUR, max: config.SUBMISSIONS_PER_DAY ?? 0 },
  ]);
  const loginLimiter = createRateLimiter([
    { ms: HOUR, max: LOGIN_LINKS_PER_HOUR },
  ]);
  app.use(
    '/api/v1',
    createApiRouter({
      submissionLimiter,
      loginLimiter,
      mailer: mailer ?? consoleMailer,
      webUrl: config.WEB_URL ?? 'http://localhost:3000',
      allowedOrigins: config.CORS_ORIGINS,
      secureCookies: config.NODE_ENV === 'production',
      knownChains: config.KNOWN_CHAINS ?? [],
      geocoder,
      // Sin secreto (desarrollo y pruebas), los enlaces solo valen hasta reiniciar.
      replyTokenSecret:
        config.REPLY_TOKEN_SECRET ?? randomBytes(32).toString('hex'),
    }),
  );

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
