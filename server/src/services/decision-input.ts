import { z } from 'zod';
import {
  businessTypes,
  publicVerificationLevels,
  verificationMethods,
} from '../catalog.js';
import { text } from './input-fields.js';

export const rejectReasons = [
  'not_independent',
  'no_evidence',
  'duplicate',
  'out_of_zone',
  'other',
] as const;

// `ModerationDecision` de la web. De `approve` aquí solo se reconoce la acción:
// lo que lleva depende del tipo de solicitud (abajo, el de un local nuevo).
export const decisionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve') }),
  z.object({
    action: z.literal('reject'),
    reason: z.enum(rejectReasons),
    note: text(1000).optional(),
  }),
  z.object({ action: z.literal('ask_info'), note: text(1000) }),
]);

export type Decision = z.infer<typeof decisionSchema>;

// Aprobar un local nuevo. El negocio da siempre el último sí antes de
// publicar su ficha (docs/07_VERIFICACION.md), así que `ownerConfirmed` es
// obligatorio y se guarda como `ownerConfirmedAt`. `location` coloca el pin a
// mano y manda sobre la geocodificación.
export const newPlaceApprovalSchema = z.object({
  level: z.enum(publicVerificationLevels),
  method: z.enum(verificationMethods),
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
  ownerConfirmed: z.literal(true, {
    error: 'el negocio tiene que haber confirmado que aparece',
  }),
  businessType: z.enum(businessTypes).default('restaurant'),
});

export type NewPlaceApproval = z.infer<typeof newPlaceApprovalSchema>;
