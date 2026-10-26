import { z } from 'zod';
import { foodTags } from '../catalog.js';
import {
  accessibility,
  countryCode,
  email,
  httpUrl,
  httpsUrl,
  latLng,
  locale,
  priceRange,
  text,
} from './input-fields.js';
import { quarantineKey } from './photo-keys.js';

// Mismas reglas que el formulario de la web (ProposeForm), vistas desde el
// servidor, que no se fía de lo que valida el navegador. Lo que no está aquí
// se descarta: así los datos de personas del equipo nunca entran en una
// propuesta de un tercero (docs/07_VERIFICACION.md).
const dishSchema = z.object({
  name: text(80),
  description: text(160).optional(),
  // Con su moneda, tal como lo escribiría el local: «8,50 €», «¥900».
  price: text(20).optional(),
  // La foto del plato: la clave que devolvió POST /uploads.
  photoKey: quarantineKey.optional(),
});

export const proposalSchema = z.object({
  name: z.string().trim().min(2).max(120),
  street: text(200).optional(),
  city: text(100),
  // Opcionales mientras la web antigua siga en circulación; la nueva los manda.
  country: countryCode.optional(),
  // Dónde colocó el local quien propone, en el mapa. Moderación lo comprueba.
  location: latLng.optional(),
  postalCode: text(10).optional(),
  // 'other' es la categoría «Otra» de la web.
  foodTags: z
    .array(z.enum([...foodTags.map((tag) => tag.key), 'other']))
    .max(10)
    .transform((tags) => [...new Set(tags)]),
  dishes: z.array(dishSchema).max(3),
  // Fotos del local, también ya subidas; Moderación las mira antes de publicarlas.
  photoKeys: z.array(quarantineKey).max(5).default([]),
  // Datos útiles para quien busca dónde ir; el negocio los confirma al publicar.
  priceRange: priceRange.optional(),
  menuUrl: httpsUrl.optional(),
  accessibility: accessibility.optional(),
  howKnown: text(1000).optional(),
  evidenceUrl: httpUrl.optional(),
  independent: z.boolean(),
  contactEmail: email.optional(),
  locale,
});

export type ProposalInput = z.infer<typeof proposalSchema>;
