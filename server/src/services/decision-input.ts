import { z } from 'zod';
import {
  businessTypes,
  publicVerificationLevels,
  verificationMethods,
} from '../catalog.js';
import { httpsUrl, priceRange, text } from './input-fields.js';
import { quarantineKey } from './photo-keys.js';

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
  // Fotos de la propuesta que no se publican (por ejemplo, una donde se
  // reconoce a alguien sin su permiso): se borran. El resto se publica.
  skipPhotos: z.array(quarantineKey).max(20).default([]),
});

export type NewPlaceApproval = z.infer<typeof newPlaceApprovalSchema>;

const pin = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;

const hasValue = (value: object) =>
  Object.values(value).some((entry) => entry !== undefined);

// Aprobar una corrección. Lo que cuenta quien la envía es texto libre, así que
// quien aprueba escribe aquí el cambio ya comprobado. Solo se puede tocar lo
// que se corrige a menudo (y el precio medio y la carta); el resto (contacto,
// descripción…) llegará cuando haga falta. Si cambia la dirección y no viene `location`, se geocodifica.
export const correctionApprovalSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    address: z
      .object({
        street: text(200).optional(),
        city: text(100).optional(),
        postalCode: text(10).optional(),
      })
      .refine(hasValue, { error: 'indica al menos un campo' })
      .optional(),
    location: pin.optional(),
    openingHours: z
      .array(
        z.object({
          day: z.number().int().min(0).max(6),
          open: z.string().regex(hhmm),
          close: z.string().regex(hhmm),
        }),
      )
      .max(21)
      .optional(),
    priceRange: priceRange.optional(),
    menuUrl: httpsUrl.optional(),
    // El local ha cerrado para siempre: deja de mostrarse.
    closed: z.literal(true).optional(),
  })
  .refine(hasValue, { error: 'indica qué cambia en la ficha' });

export type CorrectionApproval = z.infer<typeof correctionApprovalSchema>;

// Aprobar una retirada. Sin confirmar por correo que quien la pide es la
// persona o su representante, no se retira nada (docs/casos-de-uso/moderacion.md,
// CU-23). Para una historia hay que decir cuál, por su posición en la ficha.
export const removalApprovalSchema = z.object({
  identityConfirmed: z.literal(true, {
    error: 'hay que confirmar quién pide la retirada',
  }),
  storyIndex: z.number().int().min(0).max(2).optional(),
});

export type RemovalApproval = z.infer<typeof removalApprovalSchema>;

// Aprobar el equipo de un negocio. El negocio da siempre el último sí antes de
// publicar la historia de su equipo (CLAUDE.md): quien aprueba confirma que ha
// comprobado, por el correo de contacto, que lo envía el propio negocio.
export const teamApprovalSchema = z.object({
  ownerConfirmed: z.literal(true, {
    error: 'el negocio tiene que haber confirmado su equipo',
  }),
  // Fotos de personas del equipo que no se publican (por ejemplo, una donde
  // sale alguien más): se borran y la historia sale sin foto.
  skipPhotos: z.array(quarantineKey).max(3).default([]),
});

export type TeamApproval = z.infer<typeof teamApprovalSchema>;
