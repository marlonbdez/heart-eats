import { Router } from 'express';
import type { RateLimiter } from '../middleware/rate-limit.js';
import {
  proposalSchema,
  type ProposalInput,
} from '../services/proposal-input.js';
import { proposalWarnings } from '../services/suggestion-warnings.js';
import { normalize } from '../text.js';
import { submissionHandler } from './submission.js';

interface ProposalsOptions {
  limiter: RateLimiter;
  chains: readonly string[];
}

// Lo que se guarda como contenido de la propuesta: nada de correo ni de idioma.
function toPayload(input: ProposalInput) {
  const { name, street, city, postalCode, foodTags, dishes } = input;
  const { country, location } = input;
  const { photoKeys } = input;
  const { howKnown, independent } = input;
  return {
    name,
    street,
    city,
    country,
    location,
    postalCode,
    foodTags,
    dishes,
    photoKeys,
    howKnown,
    independent,
  };
}

// F2: proponer un local nuevo. Crea una solicitud `pending`; nada se publica.
export function proposalsRouter({ limiter, chains }: ProposalsOptions) {
  const router = Router();

  router.post(
    '/proposals',
    limiter.check,
    submissionHandler({
      limiter,
      schema: proposalSchema,
      photos: (input) => [
        ...input.photoKeys,
        ...input.dishes.flatMap((d) => (d.photoKey ? [d.photoKey] : [])),
      ],
      build: async (input) => {
        const cityKey = normalize(input.city);
        return {
          type: 'new',
          payload: toPayload(input),
          evidence: input.evidenceUrl ? [input.evidenceUrl] : [],
          contactEmail: input.contactEmail,
          locale: input.locale,
          warnings: await proposalWarnings({
            name: input.name,
            street: input.street,
            cityKey,
            evidenceUrl: input.evidenceUrl,
            chains,
          }),
          cityKey,
          country: input.country,
        };
      },
    }),
  );

  return router;
}
