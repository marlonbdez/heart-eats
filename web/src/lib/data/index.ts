// Capa de datos de la web: todo lo que sale o llega de la API (/api/v1) pasa por
// aquí, y no hay datos fijos.
import type {
  Bbox,
  BusinessTeamInput,
  CorrectionInput,
  FoodTag,
  ProposalInput,
  RegionCountry,
  RemovalInput,
  Restaurant,
  Zone,
} from '../types';
import { ApiRequestError, apiGet, apiPost } from '../api';
import { uploadPhoto } from './uploads';

const PAGE_SIZE = 100;
// Tope de páginas por si la API no cerrara nunca el cursor.
const MAX_PAGES = 100;
// Páginas que se piden de lo que se ve en el mapa (cada marcador es un botón).
const AREA_PAGES = 3;

// Dónde hay locales publicados: alimenta el selector de zona.
export async function getRegions(): Promise<RegionCountry[]> {
  const res = await apiGet<{ countries: RegionCountry[] }>('/regions');
  return res.countries;
}

// Todos los locales publicados de una ciudad, página a página. La búsqueda y
// los filtros se aplican después en el navegador (lib/search.ts).
export async function getRestaurants(zone: Zone): Promise<Restaurant[]> {
  const all: Restaurant[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await apiGet<{ items: Restaurant[]; nextCursor?: string }>(
      '/restaurants',
      { country: zone.country, city: zone.city, limit: PAGE_SIZE, cursor },
    );
    all.push(...res.items);
    if (!res.nextCursor) break;
    cursor = res.nextCursor;
  }
  return all;
}

// Los locales que caen dentro de un rectángulo del mapa. Se piden hasta
// AREA_PAGES páginas; si aún quedan más, `truncated` avisa de que hay que acercar.
export async function getRestaurantsIn(
  bbox: Bbox,
  signal?: AbortSignal,
): Promise<{ items: Restaurant[]; truncated: boolean }> {
  const items: Restaurant[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < AREA_PAGES; page++) {
    const res = await apiGet<{ items: Restaurant[]; nextCursor?: string }>(
      '/restaurants',
      {
        bbox: [bbox.west, bbox.south, bbox.east, bbox.north].join(','),
        limit: PAGE_SIZE,
        cursor,
      },
      signal,
    );
    items.push(...res.items);
    if (!res.nextCursor) return { items, truncated: false };
    cursor = res.nextCursor;
  }
  return { items, truncated: true };
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
// Primero suben las fotos (si las hay) y el envío lleva sus claves; si una
// subida falla, no se envía nada y las ya subidas caducan solas a las 24 h.
export async function submitProposal(input: ProposalInput): Promise<void> {
  if (input.website) return; // honeypot: se descarta en silencio
  const dishKeys = await Promise.all(
    input.dishes.map(({ photo }) => photo && uploadPhoto(photo)),
  );
  const photoKeys = await Promise.all(
    (input.photos ?? []).map((photo) => uploadPhoto(photo)),
  );
  await apiPost('/proposals', {
    name: input.name,
    street: input.street,
    city: input.city,
    country: input.country,
    location: input.location,
    postalCode: input.postalCode,
    foodTags: input.foodTags,
    dishes: input.dishes.map(({ name, description }, i) => ({
      name,
      description,
      photoKey: dishKeys[i],
    })),
    photoKeys,
    priceRange: input.priceRange,
    menuUrl: input.menuUrl,
    accessibility: input.accessibility,
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
// que escribe al correo para confirmar que lo envía el negocio. Primero suben
// las fotos de las personas (si las hay) y el envío lleva sus claves; si una
// subida falla, no se envía nada y las ya subidas caducan solas a las 24 h.
export async function submitBusinessTeam(
  input: BusinessTeamInput,
): Promise<void> {
  if (input.website) return; // honeypot: se descarta en silencio
  const photoKeys = await Promise.all(
    (input.stories ?? []).map(({ photo }) => photo && uploadPhoto(photo)),
  );
  await apiPost('/teams', {
    restaurantSlug: input.restaurantSlug,
    level: input.level,
    summary: input.summary,
    areas: input.areas,
    disabilityTypes: input.disabilityTypes,
    stories: input.stories?.map(
      ({ displayName, role, storyText, consentBy }, i) => ({
        displayName,
        role,
        storyText,
        consentBy,
        photoKey: photoKeys[i],
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
export * from './photos';
export * from './staff';
export * from './replies';
