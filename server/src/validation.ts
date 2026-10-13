import type { z } from 'zod';
import { ApiError } from './errors.js';

// Valida datos de entrada con un esquema de Zod. Si no cumplen, lanza un 422
// con la lista de campos en `details` (sin devolver los valores recibidos).
export function parseOrThrow<T extends z.ZodType>(
  schema: T,
  data: unknown,
): z.infer<T> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  throw new ApiError(
    422,
    'validation_failed',
    'Los datos enviados no son válidos',
    result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      code: issue.code,
      message: issue.message,
    })),
  );
}
