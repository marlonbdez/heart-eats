import { Router } from 'express';
import { Types } from 'mongoose';
import type { RateLimiter } from '../middleware/rate-limit.js';
import { Suggestion } from '../models/suggestion.js';
import {
  proposalSchema,
  type ProposalInput,
} from '../services/proposal-input.js';
import { proposalWarnings } from '../services/suggestion-warnings.js';
import { normalize } from '../text.js';
import { parseOrThrow } from '../validation.js';

interface ProposalsOptions {
  limiter: RateLimiter;
  chains: readonly string[];
}

// Lo que se guarda como contenido de la propuesta: nada de correo ni de idioma.
function toPayload(input: ProposalInput) {
  const { name, street, city, postalCode, foodTags, dishes } = input;
  const { howKnown, independent } = input;
  return {
    name,
    street,
    city,
    postalCode,
    foodTags,
    dishes,
    howKnown,
    independent,
  };
}

// F2: proponer un local nuevo. Crea una solicitud `pending`; nada se publica.
export function proposalsRouter({ limiter, chains }: ProposalsOptions) {
  const router = Router();

  router.post('/proposals', limiter.check, async (req, res) => {
    // Trampa para bots: «website» viene vacío desde la web. Si trae algo se
    // responde igual que si todo fuera bien y no se guarda nada.
    const body: unknown = req.body;
    if (
      typeof body === 'object' &&
      body !== null &&
      typeof (body as { website?: unknown }).website === 'string' &&
      (body as { website: string }).website.trim() !== ''
    ) {
      res.status(202).json({
        id: new Types.ObjectId().toHexString(),
        status: 'pending',
      });
      return;
    }

    const input = parseOrThrow(proposalSchema, body);
    limiter.hit(req); // solo cuenta lo que se va a guardar
    const cityKey = normalize(input.city);
    const warnings = await proposalWarnings({
      name: input.name,
      street: input.street,
      cityKey,
      evidenceUrl: input.evidenceUrl,
      chains,
    });

    const suggestion = await Suggestion.create({
      type: 'new',
      payload: toPayload(input),
      evidence: input.evidenceUrl ? [input.evidenceUrl] : [],
      contactEmail: input.contactEmail,
      locale: input.locale,
      warnings,
      cityKey,
    });

    res.status(202).json({ id: suggestion.id, status: suggestion.status });
  });

  return router;
}
