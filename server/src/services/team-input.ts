import { z } from 'zod';
import {
  consentBy,
  disabilityTypes,
  teamAreas,
  teamLevels,
} from '../catalog.js';
import { email, locale, restaurantSlug, text } from './input-fields.js';

// Una historia de una persona del equipo (BusinessStoryInput de la web). Sin
// consentimiento registrado no se guarda: `consentBy` es obligatorio.
const storySchema = z.object({
  displayName: text(80),
  role: text(80),
  storyText: text(2000),
  consentBy: z.enum(consentBy),
});

// F3: el negocio cuenta su equipo (BusinessTeamInput de la web). Las fotos de
// las historias llegarán con `POST /uploads`. El correo es obligatorio:
// Moderación escribe a esa dirección para confirmar que el negocio es quien
// dice ser antes de publicar nada.
export const teamSchema = z
  .object({
    restaurantSlug,
    level: z.enum(teamLevels),
    summary: z
      .object({
        totalStaff: z.number().int().min(1).max(10000),
        staffWithDisability: z.number().int().min(0).max(10000),
      })
      .refine((s) => s.staffWithDisability <= s.totalStaff, {
        error: 'staffWithDisability no puede superar a totalStaff',
        path: ['staffWithDisability'],
      }),
    areas: z.array(z.enum(teamAreas)).max(teamAreas.length).optional(),
    disabilityTypes: z
      .array(z.enum(disabilityTypes))
      .max(disabilityTypes.length)
      .optional(),
    stories: z.array(storySchema).max(3).optional(),
    contactEmail: email,
    locale,
  })
  // Cada nivel publica solo lo suyo: lo que sobra no se guarda (nivel medio,
  // áreas y tipos; completo, además las historias).
  .transform(({ level, areas, disabilityTypes, stories, ...rest }) => ({
    ...rest,
    level,
    ...(level !== 'minimal' && { areas, disabilityTypes }),
    ...(level === 'full' && { stories }),
  }));

export type TeamInput = z.infer<typeof teamSchema>;
