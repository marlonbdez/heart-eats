import { z } from 'zod';
import { slugPattern } from './restaurant-query.js';

// Piezas comunes de los cuerpos de los envíos de la comunidad. Lo que un
// esquema no declara se descarta: así no entran datos que nadie ha pedido
// (por ejemplo, de personas del equipo; docs/07_VERIFICACION.md).
export const text = (max: number) => z.string().trim().min(1).max(max);

export const httpUrl = z
  .url({ protocol: /^https?$/ })
  .max(500)
  .refine((value) => !/\s/.test(value));

export const email = z
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());

// País (ISO 3166-1 alfa-2) y punto del mapa, tal como los manda la web.
export const countryCode = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{2}$/)
  .transform((value) => value.toUpperCase());

export const latLng = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const locale = z.enum(['es', 'en']).default('es');

// Slug de un local publicado, para correcciones y retiradas.
export const restaurantSlug = z.string().regex(slugPattern);
