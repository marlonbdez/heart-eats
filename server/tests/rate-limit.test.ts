import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../src/middleware/errors.js';
import { rateLimit } from '../src/middleware/rate-limit.js';

function appWith(max: { hour: number; day: number }) {
  const app = express();
  app.use(
    rateLimit([
      { ms: 3_600_000, max: max.hour },
      { ms: 86_400_000, max: max.day },
    ]),
  );
  app.post('/', (_req, res) => void res.sendStatus(204));
  app.use(errorHandler);
  return app;
}

describe('rateLimit', () => {
  beforeEach(() => void vi.useFakeTimers({ toFake: ['Date'] }));
  afterEach(() => void vi.useRealTimers());

  it('deja pasar hasta el máximo y luego da 429 con Retry-After', async () => {
    const app = appWith({ hour: 2, day: 10 });
    expect((await request(app).post('/')).status).toBe(204);
    expect((await request(app).post('/')).status).toBe(204);

    const res = await request(app).post('/');
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('rate_limited');
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    expect(Number(res.headers['retry-after'])).toBeLessThanOrEqual(3600);
  });

  it('vuelve a dejar pasar cuando acaba la ventana', async () => {
    const app = appWith({ hour: 1, day: 10 });
    await request(app).post('/');
    expect((await request(app).post('/')).status).toBe(429);

    vi.setSystemTime(Date.now() + 3_600_001);
    expect((await request(app).post('/')).status).toBe(204);
  });

  it('respeta también el límite diario', async () => {
    const app = appWith({ hour: 2, day: 3 });
    for (let i = 0; i < 2; i++) await request(app).post('/');
    vi.setSystemTime(Date.now() + 3_600_001);
    await request(app).post('/');

    vi.setSystemTime(Date.now() + 3_600_001);
    const res = await request(app).post('/');
    expect(res.status).toBe(429);
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(3600);
  });

  it('cuenta cada IP por separado', async () => {
    const app = express();
    app.set('trust proxy', 1);
    app.use(rateLimit([{ ms: 3_600_000, max: 1 }]));
    app.post('/', (_req, res) => void res.sendStatus(204));
    app.use(errorHandler);

    const from = (ip: string) =>
      request(app).post('/').set('X-Forwarded-For', ip);
    expect((await from('1.1.1.1')).status).toBe(204);
    expect((await from('1.1.1.1')).status).toBe(429);
    expect((await from('2.2.2.2')).status).toBe(204);
  });
});
