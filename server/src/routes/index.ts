import { Router } from 'express';
import { healthRouter } from './health.js';
import { restaurantsRouter } from './restaurants.js';

// Todo cuelga de /api/v1 (docs/02_API_SPEC.md).
export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(restaurantsRouter);
