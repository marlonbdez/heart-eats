import { Router } from 'express';
import { healthRouter } from './health.js';

// Todo cuelga de /api/v1 (docs/02_API_SPEC.md).
export const apiRouter = Router();

apiRouter.use(healthRouter);
