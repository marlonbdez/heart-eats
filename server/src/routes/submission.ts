import type { RequestHandler } from 'express';
import { Types } from 'mongoose';
import type { z } from 'zod';
import type { RateLimiter } from '../middleware/rate-limit.js';
import { Suggestion, type SuggestionRecord } from '../models/suggestion.js';
import { parseOrThrow } from '../validation.js';

// Lo que cada ruta decide de una solicitud; el estado y la fecha los pone el modelo.
export type NewSuggestion = Omit<
  SuggestionRecord,
  '_id' | 'status' | 'createdAt'
>;

interface SubmissionOptions<S extends z.ZodType> {
  limiter: RateLimiter;
  schema: S;
  // Construye la solicitud a partir de lo ya validado. Puede lanzar un ApiError
  // (por ejemplo, 404 si el local no existe).
  build: (input: z.infer<S>) => Promise<NewSuggestion>;
}

// Trampa para bots: «website» viene vacío desde la web. Si trae algo se
// responde igual que si todo fuera bien y no se guarda nada.
function isHoneypot(body: unknown) {
  if (typeof body !== 'object' || body === null) return false;
  const { website } = body as { website?: unknown };
  return typeof website === 'string' && website.trim() !== '';
}

// Flujo común de los envíos de la comunidad (sin cuenta): honeypot, validación,
// tope por IP y solicitud `pending`. Nada se publica.
export function submissionHandler<S extends z.ZodType>({
  limiter,
  schema,
  build,
}: SubmissionOptions<S>): RequestHandler {
  return async (req, res) => {
    const body: unknown = req.body;
    if (isHoneypot(body)) {
      res.status(202).json({
        id: new Types.ObjectId().toHexString(),
        status: 'pending',
      });
      return;
    }

    const input = parseOrThrow(schema, body);
    // Cuenta todo envío válido, aunque luego dé 404, y antes de cualquier
    // espera: así una ráfaga de peticiones a la vez no se salta el tope.
    limiter.hit(req);

    const suggestion = await Suggestion.create(await build(input));
    res.status(202).json({ id: suggestion.id, status: suggestion.status });
  };
}
