import type { RequestHandler } from 'express';
import { ApiError } from '../errors.js';

export interface RateWindow {
  ms: number;
  max: number;
}

interface Counter {
  count: number;
  resetAt: number;
}

// Contadores en memoria, por IP y por ventana de tiempo. La IP vive solo aquí,
// unas horas: no se guarda en la solicitud ni en los registros (docs/02_API_SPEC.md).
// Con una sola instancia basta; si hubiera varias habría que compartirlos
// (ver «Redis» en docs/05_ROADMAP.md).
export function rateLimit(windows: readonly RateWindow[]): RequestHandler {
  const counters = windows.map(() => new Map<string, Counter>());
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

  return (req, res, next) => {
    const now = Date.now();
    sweep(now);
    const key = req.ip ?? 'unknown';
    let retryAfter = 0;

    windows.forEach((window, i) => {
      const map = counters[i]!;
      let counter = map.get(key);
      if (!counter || counter.resetAt <= now) {
        counter = { count: 0, resetAt: now + window.ms };
        map.set(key, counter);
      }
      if (counter.count >= window.max) {
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
    // Solo se cuenta una petición que pasa: las rechazadas no alargan la espera.
    counters.forEach((map) => map.get(key)!.count++);
    next();
  };
}
