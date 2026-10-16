// Capa de datos de la web. Hoy lee mocks; cuando exista el backend solo
// cambia la implementación de estas funciones (fetch a /api/v1), no las pantallas.
import type {
  BusinessTeamInput,
  CorrectionInput,
  FoodTag,
  ModerationDecision,
  ModerationItem,
  ProposalInput,
  RemovalInput,
  Restaurant,
} from '../types';
import { ApiRequestError, apiGet, apiPost } from '../api';
import { moderationQueue } from './mock-moderation';
import { addToOutbox, clearOutbox, maskEmail, readOutbox } from './outbox';

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

// Simulado hasta que exista POST /api/v1/teams (el servidor aún no recibe el
// equipo de un negocio).
export async function submitBusinessTeam(
  input: BusinessTeamInput,
): Promise<void> {
  if (input.website) return; // honeypot: se descarta en silencio
  await new Promise((resolve) => setTimeout(resolve, 600));
  const place = await getRestaurant(input.restaurantSlug).catch(() => null);
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
    photoCount: input.photos?.length ?? 0,
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
