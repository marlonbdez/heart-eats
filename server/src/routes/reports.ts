import { Router } from 'express';
import type { RateLimiter } from '../middleware/rate-limit.js';
import { correctionSchema } from '../services/correction-input.js';
import { removalSchema } from '../services/removal-input.js';
import { teamSchema } from '../services/team-input.js';
import { findTargetRestaurant } from '../services/target-restaurant.js';
import { submissionHandler } from './submission.js';

// Envíos sobre un local que ya está publicado: sugerir una corrección (F4),
// contar el equipo (F3) y pedir una retirada. Crean una solicitud `pending`; nada cambia en la ficha
// hasta que alguien lo revisa.
export function reportsRouter({ limiter }: { limiter: RateLimiter }) {
  const router = Router();

  router.post(
    '/corrections',
    limiter.check,
    submissionHandler({
      limiter,
      schema: correctionSchema,
      build: async (input) => ({
        type: 'edit',
        targetRestaurantId: await findTargetRestaurant(input.restaurantSlug),
        payload: { kind: input.kind, details: input.details },
        evidence: input.evidenceUrl ? [input.evidenceUrl] : [],
        contactEmail: input.contactEmail,
        locale: input.locale,
        warnings: [],
      }),
    }),
  );

  router.post(
    '/teams',
    limiter.check,
    submissionHandler({
      limiter,
      schema: teamSchema,
      photos: (input) =>
        (input.stories ?? []).flatMap((s) => (s.photoKey ? [s.photoKey] : [])),
      build: async ({ restaurantSlug, contactEmail, locale, ...team }) => ({
        type: 'team',
        targetRestaurantId: await findTargetRestaurant(restaurantSlug),
        payload: team,
        evidence: [],
        contactEmail,
        locale,
        warnings: [],
      }),
    }),
  );

  router.post(
    '/removals',
    limiter.check,
    submissionHandler({
      limiter,
      schema: removalSchema,
      build: async (input) => ({
        type: 'removal',
        targetRestaurantId: await findTargetRestaurant(input.restaurantSlug),
        payload: { what: input.what, details: input.details },
        evidence: [],
        contactEmail: input.contactEmail,
        locale: input.locale,
        warnings: [],
      }),
    }),
  );

  return router;
}
