import { z } from 'zod';
import { email, locale } from './input-fields.js';

export const loginRequestSchema = z.object({ email, locale });

// Longitud de un token de 32 bytes en base64url; cualquier otra cosa se
// rechaza antes de tocar la base de datos.
export const sessionRequestSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});
