import { z } from 'zod';
import {
  email,
  httpUrl,
  locale,
  restaurantSlug,
  text,
} from './input-fields.js';

export const correctionKinds = [
  'address',
  'hours',
  'closed',
  'team',
  'other',
] as const;

// F4: corrección sugerida sobre un local publicado (CorrectionInput de la web).
export const correctionSchema = z.object({
  restaurantSlug,
  kind: z.enum(correctionKinds),
  details: text(1000),
  evidenceUrl: httpUrl.optional(),
  contactEmail: email.optional(),
  locale,
});

export type CorrectionInput = z.infer<typeof correctionSchema>;
