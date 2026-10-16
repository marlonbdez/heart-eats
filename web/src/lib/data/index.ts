// Capa de datos de la web: todo lo que sale o llega de la API (/api/v1) pasa por
// aquí, y no hay datos fijos.
import type {
  BusinessTeamInput,
  CorrectionInput,
  FoodTag,
  ProposalInput,
  RemovalInput,
  Restaurant,
} from '../types';
import { ApiRequestError, apiGet, apiPost } from '../api';

// Zona que se lee hoy. Al abrir otros países se amplía aquí.
const COUNTRY = 'ES';
const PAGE_SIZE = 100;
// Tope de páginas por si la API no cerrara nunca el cursor.
const MAX_PAGES = 100;

// Todos los locales publicados de la zona, página a página. La búsqueda y los
// filtros se aplican después en el navegador (lib/search.ts).
export async function getRestaurants(): Promise<Restaurant[]> {
  const all: Restaurant[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await apiGet<{ items: Restaurant[]; nextCursor?: string }>(
      '/restaurants',
      { country: COUNTRY, limit: PAGE_SIZE, cursor },
    );
    all.push(...res.items);
    if (!res.nextCursor) break;
    cursor = res.nextCursor;
  }
  return all;
}

export async function getRestaurant(slug: string): Promise<Restaurant | null> {
  try {
    return await apiGet<Restaurant>(`/restaurants/${encodeURIComponent(slug)}`);
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) return null;
    throw err;
  }
}

export async function getFoodTags(): Promise<FoodTag[]> {
  const res = await apiGet<{ foodTags: FoodTag[] }>('/meta/filters');
  return res.foodTags;
}

// Propuesta de un local nuevo (POST /api/v1/proposals). Entra en moderación.
// Las fotos de los platos no se envían todavía (falta POST /uploads).
export async function submitProposal(input: ProposalInput): Promise<void> {
  if (input.website) return; // honeypot: se descarta en silencio
  await apiPost('/proposals', {
    name: input.name,
    street: input.street,
    city: input.city,
    postalCode: input.postalCode,
    foodTags: input.foodTags,
    dishes: input.dishes.map(({ name, description }) => ({
      name,
      description,
    })),
    howKnown: input.howKnown,
    evidenceUrl: input.evidenceUrl,
    independent: input.independent,
    contactEmail: input.contactEmail,
    locale: input.locale,
  });
}

// Corrección sobre un local publicado (POST /api/v1/corrections).
export async function submitCorrection(input: CorrectionInput): Promise<void> {
  if (input.website) return; // honeypot: se descarta en silencio
  await apiPost('/corrections', {
    restaurantSlug: input.restaurantSlug,
    kind: input.kind,
    details: input.details,
    evidenceUrl: input.evidenceUrl,
    contactEmail: input.contactEmail,
    locale: input.locale,
  });
}

// El equipo que cuenta un negocio (POST /api/v1/teams). Entra en moderación,
// que escribe al correo para confirmar que lo envía el negocio. Las fotos no
// se envían todavía (falta POST /uploads).
export async function submitBusinessTeam(
  input: BusinessTeamInput,
): Promise<void> {
  if (input.website) return; // honeypot: se descarta en silencio
  await apiPost('/teams', {
    restaurantSlug: input.restaurantSlug,
    level: input.level,
    summary: input.summary,
    areas: input.areas,
    disabilityTypes: input.disabilityTypes,
    stories: input.stories?.map(
      ({ displayName, role, storyText, consentBy }) => ({
        displayName,
        role,
        storyText,
        consentBy,
      }),
    ),
    contactEmail: input.contactEmail,
    locale: input.locale,
  });
}

// Petición de retirada (POST /api/v1/removals). Moderación escribe al correo
// para confirmar quién la hace antes de ocultar nada.
export async function submitRemoval(input: RemovalInput): Promise<void> {
  if (input.website) return; // honeypot: se descarta en silencio
  await apiPost('/removals', {
    restaurantSlug: input.restaurantSlug,
    what: input.what,
    details: input.details,
    contactEmail: input.contactEmail,
    locale: input.locale,
  });
}

export * from './moderation';
export * from './replies';
