import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../src/middleware/errors.js';
import {
  createRateLimiter,
  type RateWindow,
} from '../src/middleware/rate-limit.js';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

// POST / cuenta como envío guardado; POST /sin-guardar pasa el filtro pero no
// llama a hit(), como un envío con errores o el del honeypot.
function appWith(windows: RateWindow[], trustProxy = false) {
  const limiter = createRateLimiter(windows);
  const app = express();
  if (trustProxy) app.set('trust proxy', 1);
  app.post('/', limiter.check, (req, res) => {
    limiter.hit(req);
    res.sendStatus(204);
  });
  app.post(
    '/sin-guardar',
    limiter.check,
    (_req, res) => void res.sendStatus(204),
  );
  app.use(errorHandler);
  return app;
}

describe('createRateLimiter', () => {
  beforeEach(() => void vi.useFakeTimers({ toFake: ['Date'] }));
  afterEach(() => void vi.useRealTimers());

  it('deja pasar hasta el máximo y luego da 429 con Retry-After', async () => {
    const app = appWith([{ ms: HOUR, max: 2 }]);
    expect((await request(app).post('/')).status).toBe(204);
    expect((await request(app).post('/')).status).toBe(204);

    const res = await request(app).post('/');
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('rate_limited');
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    expect(Number(res.headers['retry-after'])).toBeLessThanOrEqual(3600);
  });

  it('solo cuenta lo que llama a hit()', async () => {
    const app = appWith([{ ms: HOUR, max: 1 }]);
    for (let i = 0; i < 5; i++) {
      expect((await request(app).post('/sin-guardar')).status).toBe(204);
    }
    expect((await request(app).post('/')).status).toBe(204);
    expect((await request(app).post('/')).status).toBe(429);
  });

  it('vuelve a dejar pasar cuando acaba la ventana', async () => {
    const app = appWith([{ ms: HOUR, max: 1 }]);
    await request(app).post('/');
    expect((await request(app).post('/')).status).toBe(429);

    vi.setSystemTime(Date.now() + HOUR + 1);
    expect((await request(app).post('/')).status).toBe(204);
  });

  it('respeta también el tope diario', async () => {
    const app = appWith([
      { ms: HOUR, max: 2 },
      { ms: DAY, max: 3 },
    ]);
    for (let i = 0; i < 2; i++) await request(app).post('/');
    vi.setSystemTime(Date.now() + HOUR + 1);
    await request(app).post('/');

    const res = await request(app).post('/');
    expect(res.status).toBe(429);
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(3600);
  });

  it('con max 0 no hay límite', async () => {
    const app = appWith([
      { ms: HOUR, max: 0 },
      { ms: DAY, max: 0 },
    ]);
    for (let i = 0; i < 10; i++) {
      expect((await request(app).post('/')).status).toBe(204);
    }
  });

  it('cuenta cada IP por separado', async () => {
    const app = appWith([{ ms: HOUR, max: 1 }], true);
    const from = (ip: string) =>
      request(app).post('/').set('X-Forwarded-For', ip);
    expect((await from('1.1.1.1')).status).toBe(204);
    expect((await from('1.1.1.1')).status).toBe(429);
    expect((await from('2.2.2.2')).status).toBe(204);
  });
});
