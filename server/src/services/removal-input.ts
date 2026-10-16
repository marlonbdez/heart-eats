import { z } from 'zod';
import { email, locale, restaurantSlug, text } from './input-fields.js';

export const removalTargets = ['story', 'photo', 'listing', 'data'] as const;

// Petición de retirada (RemovalInput de la web). El correo es obligatorio:
// Moderación escribe a esa dirección para confirmar quién la hace antes de
// ocultar nada.
export const removalSchema = z.object({
  restaurantSlug,
  what: z.enum(removalTargets),
  details: text(1000).optional(),
  contactEmail: email,
  locale,
});

export type RemovalInput = z.infer<typeof removalSchema>;
