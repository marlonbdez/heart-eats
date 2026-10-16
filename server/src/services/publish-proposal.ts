import { Restaurant, type RestaurantRecord } from '../models/restaurant.js';
import { normalize } from '../text.js';
import type { NewPlaceApproval } from './decision-input.js';
import { proposalSchema } from './proposal-input.js';

// Lo que guarda una propuesta de un local nuevo (`toPayload` de las rutas).
const storedProposal = proposalSchema.pick({
  name: true,
  street: true,
  city: true,
  postalCode: true,
  foodTags: true,
  dishes: true,
  independent: true,
});

const MAX_SLUG = 70; // el modelo admite 80; deja sitio al sufijo
const MAX_ATTEMPTS = 6;

export function slugify(value: string) {
  const slug = normalize(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG)
    .replace(/-+$/g, '');
  return slug || 'local';
}

const isDuplicateSlug = (err: unknown) =>
  typeof err === 'object' &&
  err !== null &&
  (err as { code?: unknown }).code === 11000;

interface PublishInput {
  payload: Record<string, unknown>;
  approval: NewPlaceApproval;
  pin: { lat: number; lng: number };
  country: string;
  now: Date;
}

// A la propuesta le falta un dato que la ficha necesita y que Moderación no
// puede poner: hay que pedirlo a quien propuso.
export class IncompleteProposalError extends Error {
  constructor(readonly field: 'street' | 'foodTags') {
    super(`A la propuesta le falta ${field}`);
  }
}

// Publica la ficha de una propuesta aprobada. El slug sale del nombre y la
// ciudad; si ya existe, se le añade un número.
export async function publishProposal({
  payload,
  approval,
  pin,
  country,
  now,
}: PublishInput): Promise<RestaurantRecord> {
  const proposal = storedProposal.parse(payload);
  if (!proposal.street) throw new IncompleteProposalError('street');
  if (proposal.foodTags.length === 0) {
    throw new IncompleteProposalError('foodTags');
  }

  const base = slugify(`${proposal.name} ${proposal.city}`);
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const slug = attempt === 1 ? base : `${base}-${attempt}`;
    if (await Restaurant.exists({ slug })) continue;
    try {
      const created = await Restaurant.create({
        slug,
        name: proposal.name,
        businessType: approval.businessType,
        foodTags: proposal.foodTags,
        address: {
          street: proposal.street,
          postalCode: proposal.postalCode,
          city: proposal.city,
          country,
        },
        location: { type: 'Point', coordinates: [pin.lng, pin.lat] },
        signatureDishes: proposal.dishes,
        isIndependent: proposal.independent,
        status: 'published',
        verification: {
          level: approval.level,
          method: approval.method,
          lastVerifiedAt: now,
        },
        ownerConfirmedAt: now,
      });
      return created.toObject() as unknown as RestaurantRecord;
    } catch (err) {
      // Otra aprobación se quedó con el slug entre la consulta y el guardado.
      if (!isDuplicateSlug(err)) throw err;
    }
  }
  throw new Error('No se encontró un slug libre para la ficha');
}
