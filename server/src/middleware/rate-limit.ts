import type { Request, RequestHandler } from 'express';
import { ApiError } from '../errors.js';

export interface RateWindow {
  ms: number;
  // 0 desactiva esta ventana.
  max: number;
}

interface Counter {
  count: number;
  resetAt: number;
}

export interface RateLimiter {
  // Corta con 429 si esa IP ya ha gastado su cupo. No cuenta nada.
  check: RequestHandler;
  // Gasta una unidad de cupo. La ruta la llama solo cuando va a guardar algo:
  // un envío con errores o descartado por el honeypot no cuenta.
  hit: (req: Request) => void;
}

// Contadores en memoria, por IP y por ventana de tiempo. La IP vive solo aquí,
// unas horas: no se guarda en la solicitud ni en los registros (docs/02_API_SPEC.md).
// Con una sola instancia basta; si hubiera varias habría que compartirlos
// (ver «Redis» en docs/05_ROADMAP.md).
export function createRateLimiter(windows: readonly RateWindow[]): RateLimiter {
  const active = windows.filter((window) => window.max > 0);
  const counters = active.map(() => new Map<string, Counter>());
  const keyOf = (req: Request) => req.ip ?? 'unknown';
  let lastSweep = 0;

  // Quita los contadores caducados para que el mapa no crezca sin límite.
  const sweep = (now: number) => {
    if (now - lastSweep < 60_000) return;
    lastSweep = now;
    for (const map of counters) {
      for (const [key, counter] of map) {
        if (counter.resetAt <= now) map.delete(key);
      }
    }
  };

  const check: RequestHandler = (req, res, next) => {
    const now = Date.now();
    sweep(now);
    const key = keyOf(req);
    let retryAfter = 0;

    active.forEach((window, i) => {
      const counter = counters[i]!.get(key);
      if (counter && counter.resetAt > now && counter.count >= window.max) {
        retryAfter = Math.max(
          retryAfter,
          Math.ceil((counter.resetAt - now) / 1000),
        );
      }
    });

    if (retryAfter > 0) {
      res.set('Retry-After', String(retryAfter));
      next(new ApiError(429, 'rate_limited', 'Demasiadas peticiones'));
      return;
    }
    next();
  };

  const hit = (req: Request) => {
    const now = Date.now();
    const key = keyOf(req);
    active.forEach((window, i) => {
      const map = counters[i]!;
      let counter = map.get(key);
      if (!counter || counter.resetAt <= now) {
        counter = { count: 0, resetAt: now + window.ms };
        map.set(key, counter);
      }
      counter.count++;
    });
  };

  return { check, hit };
}
