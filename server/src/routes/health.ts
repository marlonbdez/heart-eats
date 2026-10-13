import { Router } from 'express';

export const healthRouter = Router();

// No toca la base de datos: sirve para saber si el servicio está despierto.
healthRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});
