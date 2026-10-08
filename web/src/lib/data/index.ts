// Capa de datos de la web. Hoy lee mocks; cuando exista el backend solo
// cambia la implementación de estas funciones (fetch a /api/v1), no las pantallas.
import type {
  BusinessTeamInput,
  CorrectionInput,
  FoodTag,
  ProposalInput,
  Restaurant,
  RestaurantQuery,
} from '../types';
import { matchesQuery } from '../search';
import { foodTags, restaurants } from './mock-restaurants';

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
}

// Igual que la propuesta: simulado hasta que exista POST /api/v1/corrections.
export async function submitCorrection(input: CorrectionInput): Promise<void> {
  if (input.website) return; // honeypot: se descarta en silencio
  await new Promise((resolve) => setTimeout(resolve, 600));
}

// Igual que las anteriores: simulado hasta que exista POST /api/v1/teams.
export async function submitBusinessTeam(
  input: BusinessTeamInput,
): Promise<void> {
  if (input.website) return; // honeypot: se descarta en silencio
  await new Promise((resolve) => setTimeout(resolve, 600));
}
