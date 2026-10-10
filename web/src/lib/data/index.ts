// Capa de datos de la web. Hoy lee mocks; cuando exista el backend solo
// cambia la implementación de estas funciones (fetch a /api/v1), no las pantallas.
import type {
  BusinessTeamInput,
  CorrectionInput,
  FoodTag,
  ModerationDecision,
  ModerationItem,
  ProposalInput,
  Restaurant,
  RestaurantQuery,
} from '../types';
import { matchesQuery } from '../search';
import { moderationQueue } from './mock-moderation';
import { foodTags, restaurants } from './mock-restaurants';
import { addToOutbox, clearOutbox, maskEmail, readOutbox } from './outbox';

export async function getRestaurants(
  query: RestaurantQuery = {},
): Promise<Restaurant[]> {
  return restaurants.filter((r) => matchesQuery(r, query));
}

export async function getRestaurant(slug: string): Promise<Restaurant | null> {
  return restaurants.find((r) => r.slug === slug) ?? null;
}

export async function getFoodTags(): Promise<FoodTag[]> {
  return foodTags;
}

// Envío simulado: no hay backend todavía. Cuando exista, esto pasa a
// POST /api/v1/proposals con la misma firma.
export async function submitProposal(input: ProposalInput): Promise<void> {
  if (input.website) return; // honeypot: se descarta en silencio
  await new Promise((resolve) => setTimeout(resolve, 600));
  addToOutbox({
    kind: 'new',
    name: input.name,
    neighborhood: input.city,
    address: [input.street, input.postalCode, input.city]
      .filter(Boolean)
      .join(', '),
    contactMasked: maskEmail(input.contactEmail),
    warnings: input.evidenceUrl ? [] : [{ kind: 'noEvidence' }],
    foodTags: input.foodTags,
    dishes: input.dishes.map((d) => d.name),
    howKnown: input.howKnown,
    evidenceUrl: input.evidenceUrl,
  });
}

// Igual que la propuesta: simulado hasta que exista POST /api/v1/corrections.
export async function submitCorrection(input: CorrectionInput): Promise<void> {
  if (input.website) return; // honeypot: se descarta en silencio
  await new Promise((resolve) => setTimeout(resolve, 600));
  const place = restaurants.find((r) => r.slug === input.restaurantSlug);
  addToOutbox({
    kind: 'correction',
    name: place?.name ?? input.restaurantSlug,
    neighborhood: place?.address.neighborhood ?? place?.address.city ?? '',
    address: place
      ? `${place.address.street}, ${place.address.city}`
      : input.restaurantSlug,
    contactMasked: maskEmail(input.contactEmail),
    warnings: [],
    restaurantSlug: input.restaurantSlug,
    evidenceUrl: input.evidenceUrl,
    correction: {
      kind: input.kind,
      before: input.kind === 'address' ? place?.address.street : undefined,
      after: input.details,
    },
  });
}

// Igual que las anteriores: simulado hasta que exista POST /api/v1/teams.
export async function submitBusinessTeam(
  input: BusinessTeamInput,
): Promise<void> {
  if (input.website) return; // honeypot: se descarta en silencio
  await new Promise((resolve) => setTimeout(resolve, 600));
  const place = restaurants.find((r) => r.slug === input.restaurantSlug);
  addToOutbox({
    kind: 'team',
    name: place?.name ?? input.restaurantSlug,
    neighborhood: place?.address.neighborhood ?? place?.address.city ?? '',
    address: place
      ? `${place.address.street}, ${place.address.city}`
      : input.restaurantSlug,
    contactMasked: maskEmail(input.contactEmail),
    warnings: [],
    restaurantSlug: input.restaurantSlug,
    // Solo cifras y categorías: nunca nombres ni textos de historias.
    team: {
      level: input.level,
      totalStaff: input.summary.totalStaff,
      staffWithDisability: input.summary.staffWithDisability,
      areas: input.areas,
      disabilityTypes: input.disabilityTypes,
      stories: input.stories?.length ?? 0,
    },
  });
}

// Cola de moderación. Cuando exista el backend: GET /api/v1/suggestions
// (solo moderación).
export async function getModerationQueue(): Promise<ModerationItem[]> {
  return moderationQueue;
}

// Decisión simulada: no guarda nada. Cuando exista el backend pasa a
// POST /api/v1/suggestions/:id/decision y deja una entrada en el registro de
// auditoría.
export async function decideModeration(
  id: string,
  decision: ModerationDecision,
): Promise<void> {
  void id;
  void decision;
  await new Promise((resolve) => setTimeout(resolve, 400));
}

// Envíos hechos desde este navegador (buzón de prueba, ver outbox.ts). Con el
// servidor desaparece: la cola de arriba ya los traerá.
export async function getDemoSubmissions(): Promise<ModerationItem[]> {
  return readOutbox();
}

export async function clearDemoSubmissions(): Promise<void> {
  clearOutbox();
}
