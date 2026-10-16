import { Router } from 'express';
import type { RateLimiter } from '../middleware/rate-limit.js';
import type { Mailer } from '../services/mailer.js';
import { authRouter } from './auth.js';
import { healthRouter } from './health.js';
import { proposalsRouter } from './proposals.js';
import { reportsRouter } from './reports.js';
import { restaurantsRouter } from './restaurants.js';
import { suggestionsRouter } from './suggestions.js';

interface ApiOptions {
  submissionLimiter: RateLimiter;
  loginLimiter: RateLimiter;
  mailer: Mailer;
  webUrl: string;
  allowedOrigins: readonly string[];
  secureCookies: boolean;
  knownChains: readonly string[];
}

// Todo cuelga de /api/v1 (docs/02_API_SPEC.md).
export function createApiRouter({
  submissionLimiter,
  loginLimiter,
  mailer,
  webUrl,
  allowedOrigins,
  secureCookies,
  knownChains,
}: ApiOptions) {
  const api = Router();
  api.use(healthRouter);
  api.use(restaurantsRouter);
  api.use(proposalsRouter({ limiter: submissionLimiter, chains: knownChains }));
  api.use(reportsRouter({ limiter: submissionLimiter }));
  api.use(
    authRouter({
      limiter: loginLimiter,
      mailer,
      webUrl,
      allowedOrigins,
      secureCookies,
    }),
  );
  api.use(suggestionsRouter({ allowedOrigins }));
  return api;
}
