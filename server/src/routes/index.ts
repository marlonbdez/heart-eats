import { Router } from 'express';
import type { RateLimiter } from '../middleware/rate-limit.js';
import type { Geocoder } from '../services/geocoder.js';
import type { Mailer } from '../services/mailer.js';
import type { PhotoStore } from '../services/photo-store.js';
import { auditRouter } from './audit.js';
import { authRouter } from './auth.js';
import { healthRouter } from './health.js';
import { photosRouter } from './photos.js';
import { proposalsRouter } from './proposals.js';
import { regionsRouter } from './regions.js';
import { restaurantPhotosRouter } from './restaurant-photos.js';
import { repliesRouter } from './replies.js';
import { reportsRouter } from './reports.js';
import { restaurantsRouter } from './restaurants.js';
import { suggestionsRouter } from './suggestions.js';
import { uploadsRouter } from './uploads.js';
import { usersRouter } from './users.js';

interface ApiOptions {
  submissionLimiter: RateLimiter;
  loginLimiter: RateLimiter;
  uploadLimiter: RateLimiter;
  mailer: Mailer;
  webUrl: string;
  allowedOrigins: readonly string[];
  secureCookies: boolean;
  knownChains: readonly string[];
  replyTokenSecret: string;
  geocoder?: Geocoder;
  photoStore?: PhotoStore;
  // Origen público de la API, para las direcciones de las fotos.
  apiUrl?: string;
}

// Todo cuelga de /api/v1 (docs/02_API_SPEC.md).
export function createApiRouter({
  submissionLimiter,
  loginLimiter,
  uploadLimiter,
  mailer,
  webUrl,
  allowedOrigins,
  secureCookies,
  knownChains,
  replyTokenSecret,
  geocoder,
  photoStore,
  apiUrl,
}: ApiOptions) {
  const api = Router();
  api.use(healthRouter);
  api.use(restaurantsRouter({ apiUrl }));
  api.use(photosRouter({ store: photoStore }));
  api.use(regionsRouter);
  api.use(proposalsRouter({ limiter: submissionLimiter, chains: knownChains }));
  api.use(reportsRouter({ limiter: submissionLimiter }));
  api.use(uploadsRouter({ limiter: uploadLimiter, store: photoStore }));
  api.use(
    authRouter({
      limiter: loginLimiter,
      mailer,
      webUrl,
      allowedOrigins,
      secureCookies,
    }),
  );
  api.use(repliesRouter({ replyTokenSecret }));
  api.use(
    suggestionsRouter({
      allowedOrigins,
      mailer,
      webUrl,
      replyTokenSecret,
      geocoder,
      photoStore,
      apiUrl,
    }),
  );
  api.use(
    restaurantPhotosRouter({ allowedOrigins, store: photoStore, apiUrl }),
  );
  api.use(auditRouter({ allowedOrigins }));
  api.use(usersRouter({ allowedOrigins }));
  return api;
}
