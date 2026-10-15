import { Router, type RequestHandler } from 'express';
import { healthRouter } from './health.js';
import { proposalsRouter } from './proposals.js';
import { restaurantsRouter } from './restaurants.js';

interface ApiOptions {
  submissionLimiter: RequestHandler;
  knownChains: readonly string[];
}

// Todo cuelga de /api/v1 (docs/02_API_SPEC.md).
export function createApiRouter({
  submissionLimiter,
  knownChains,
}: ApiOptions) {
  const api = Router();
  api.use(healthRouter);
  api.use(restaurantsRouter);
  api.use(proposalsRouter({ limiter: submissionLimiter, chains: knownChains }));
  return api;
}
