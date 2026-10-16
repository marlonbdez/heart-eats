import { z } from 'zod';
import { email, text } from './input-fields.js';

const scope = z.object({
  country: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/)
    .transform((value) => value.toUpperCase()),
  city: text(100).optional(),
});

// Invitación de un moderador (ADR 0008): su correo y dónde puede decidir.
// Los administradores no se crean por aquí.
export const inviteSchema = z.object({
  email,
  moderationScope: z.array(scope).min(1).max(10),
});

export type Invite = z.infer<typeof inviteSchema>;
