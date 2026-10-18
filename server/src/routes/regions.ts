import { Router } from 'express';
import { summarizeRegions } from '../services/region-summary.js';

export const regionsRouter = Router();

// Países y ciudades con locales publicados (para el selector de zona de la web).
regionsRouter.get('/regions', async (_req, res) => {
  res.set('Cache-Control', 'public, max-age=60').json({
    countries: await summarizeRegions(),
  });
});
