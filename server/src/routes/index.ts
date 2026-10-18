import { Router } from 'express';
import type { RateLimiter } from '../middleware/rate-limit.js';
import type { Geocoder } from '../services/geocoder.js';
import type { Mailer } from '../services/mailer.js';
import type { PhotoStore } from '../services/photo-store.js';
import { auditRouter } from './audit.js';
import { authRouter } from './auth.js';
import { healthRouter } from './health.js';
import { proposalsRouter } from './proposals.js';
import { regionsRouter } from './regions.js';
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
}: ApiOptions) {
  const api = Router();
  api.use(healthRouter);
  api.use(restaurantsRouter);
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
    }),
  );
  api.use(auditRouter({ allowedOrigins }));
  api.use(usersRouter({ allowedOrigins }));
  return api;
}
