import { z } from 'zod';
import { foodTags } from '../catalog.js';
import { email, httpUrl, locale, text } from './input-fields.js';
import { quarantineKey } from './photo-keys.js';

// Mismas reglas que el formulario de la web (ProposeForm), vistas desde el
// servidor, que no se fía de lo que valida el navegador. Lo que no está aquí
// se descarta: así los datos de personas del equipo nunca entran en una
// propuesta de un tercero (docs/07_VERIFICACION.md).
const dishSchema = z.object({
  name: text(80),
  description: text(160).optional(),
  // La foto del plato: la clave que devolvió POST /uploads.
  photoKey: quarantineKey.optional(),
});

export const proposalSchema = z.object({
  name: z.string().trim().min(2).max(120),
  street: text(200).optional(),
  city: text(100),
  postalCode: text(10).optional(),
  // 'other' es la categoría «Otra» de la web.
  foodTags: z
    .array(z.enum([...foodTags.map((tag) => tag.key), 'other']))
    .max(10)
    .transform((tags) => [...new Set(tags)]),
  dishes: z.array(dishSchema).max(3),
  // Fotos del local, también ya subidas; Moderación las mira antes de publicarlas.
  photoKeys: z.array(quarantineKey).max(5).default([]),
  howKnown: text(1000).optional(),
  evidenceUrl: httpUrl.optional(),
  independent: z.boolean(),
  contactEmail: email.optional(),
  locale,
});

export type ProposalInput = z.infer<typeof proposalSchema>;
