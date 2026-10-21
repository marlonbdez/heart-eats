import type { RestaurantRecord } from '../models/restaurant.js';
import type {
  SuggestionRecord,
  SuggestionWarning,
} from '../models/suggestion.js';
import { maskEmail } from './mask-email.js';
import { fileOf, quarantineKey, thumbOf } from './photo-keys.js';

// Lo que necesita saber de un local al que apunta una solicitud.
export type TargetRestaurant = Pick<
  RestaurantRecord,
  '_id' | 'slug' | 'name' | 'address'
>;

// Forma de una solicitud para quien modera (docs/02_API_SPEC.md). Sigue a
// `ModerationItem` de la web, con `type` en lugar de `kind` y la fecha en vez
// de «hace N días»: eso lo calcula la pantalla.
export interface ModerationItem {
  id: string;
  type: SuggestionRecord['type'];
  status: SuggestionRecord['status'];
  createdAt: string;
  locale: SuggestionRecord['locale'];
  name: string;
  neighborhood: string;
  address: string;
  contactMasked?: string;
  warnings: SuggestionWarning[];
  evidenceUrl?: string;
  // Lo que se pidió y lo que respondió quien propuso, si hubo «Info pedida».
  infoRequest?: { note: string; deadline: string };
  replies?: { message: string; at: string }[];
  // Solo en un local nuevo:
  // País que dio quien propone (ISO 3166-1 alfa-2); las antiguas no lo llevan.
  country?: string;
  // El pin que dejó el geocodificador o quien propone; sin él, se coloca a mano.
  location?: { lat: number; lng: number };
  // De dónde viene el pin: `proposer` si lo colocó quien propone en el mapa.
  locationBy?: 'proposer' | 'address';
  foodTags?: string[];
  dishes?: string[];
  // Fotos en cuarentena, mientras la solicitud espera. `key` es lo que se manda
  // en `skipPhotos` para dejar una fuera; `dish` dice de qué plato es.
  photos?: { key: string; url: string; thumbUrl: string; dish?: string }[];
  howKnown?: string;
  // Solo en correcciones y retiradas:
  restaurantSlug?: string;
  correction?: { kind: string; before?: string; after: string };
  removal?: { what: string; details?: string };
  // Solo en el equipo de un negocio. La lista y quien no es admin ven solo
  // cuántas historias hay; los nombres y los textos (`storyTexts`) salen
  // únicamente al abrir la solicitud un administrador, que es quien decide.
  team?: {
    level: string;
    totalStaff: number;
    staffWithDisability: number;
    areas?: string[];
    disabilityTypes?: string[];
    stories: number;
    storyTexts?: TeamStory[];
  };
}

export interface TeamStory {
  displayName: string;
  role: string;
  storyText: string;
  consentBy: string;
  // La foto en cuarentena, mientras la solicitud espera. `key` es lo que se
  // manda en `skipPhotos` para dejarla fuera.
  photo?: { key: string; url: string; thumbUrl: string };
}

// Una foto en cuarentena de una solicitud, con las direcciones por las que
// Moderación la ve (`GET /suggestions/:id/photos/:file`).
function quarantinePhoto(apiUrl: string, id: string, key: string) {
  const file = fileOf(key);
  const at = (name: string) =>
    `${apiUrl}/api/v1/suggestions/${id}/photos/${name}`;
  return { key, url: at(file), thumbUrl: at(thumbOf(file)) };
}

export interface ItemOptions {
  // Incluye los nombres y textos de las historias de un equipo.
  withStories?: boolean;
  // Origen de la API, para las direcciones de las fotos en cuarentena.
  apiUrl?: string;
}

// Lo que guardan las rutas de envío en `payload` (routes/proposals.ts y
// routes/reports.ts).
interface ProposalPayload {
  name: string;
  street?: string;
  city: string;
  country?: string;
  postalCode?: string;
  foodTags: string[];
  dishes: { name: string; photoKey?: string }[];
  photoKeys?: string[];
  howKnown?: string;
}
interface CorrectionPayload {
  kind: string;
  details: string;
}
interface TeamPayload {
  level: string;
  summary: { totalStaff: number; staffWithDisability: number };
  areas?: string[];
  disabilityTypes?: string[];
  stories?: (Omit<TeamStory, 'photo'> & { photoKey?: string })[];
}
interface RemovalPayload {
  what: string;
  details?: string;
}

const join = (...parts: (string | undefined)[]) =>
  parts.filter(Boolean).join(', ');

export function toModerationItem(
  s: SuggestionRecord,
  target?: TargetRestaurant,
  { withStories = false, apiUrl = '' }: ItemOptions = {},
): ModerationItem {
  const base = {
    id: String(s._id),
    type: s.type,
    status: s.status,
    createdAt: s.createdAt.toISOString(),
    locale: s.locale,
    contactMasked: maskEmail(s.contactEmail),
    warnings: s.warnings,
    evidenceUrl: s.evidence[0],
    infoRequest: s.infoRequest && {
      note: s.infoRequest.note,
      deadline: s.infoRequest.deadline.toISOString(),
    },
    replies: s.replies?.length
      ? s.replies.map((r) => ({ message: r.message, at: r.at.toISOString() }))
      : undefined,
  };

  // Resuelta la solicitud, las fotos ya no están en la cuarentena.
  const waiting = s.status === 'pending' || s.status === 'info_requested';

  if (s.type === 'new') {
    const p = s.payload as unknown as ProposalPayload;
    const photo = (key: string, dish?: string) => ({
      ...quarantinePhoto(apiUrl, String(s._id), key),
      ...(dish ? { dish } : {}),
    });
    const valid = (key: unknown): key is string =>
      quarantineKey.safeParse(key).success;
    const photos = waiting
      ? [
          ...(p.photoKeys ?? []).filter(valid).map((key) => photo(key)),
          ...p.dishes.flatMap((d) =>
            valid(d.photoKey) ? [photo(d.photoKey, d.name)] : [],
          ),
        ]
      : [];
    return {
      ...base,
      name: p.name,
      neighborhood: p.city,
      address: join(p.street, p.postalCode, p.city),
      ...(p.country ? { country: p.country } : {}),
      foodTags: p.foodTags,
      dishes: p.dishes.map((d) => d.name),
      ...(photos.length > 0 ? { photos } : {}),
      howKnown: p.howKnown,
      location:
        s.geocode?.lat !== undefined && s.geocode.lng !== undefined
          ? { lat: s.geocode.lat, lng: s.geocode.lng }
          : undefined,
      locationBy:
        s.geocode?.lat === undefined
          ? undefined
          : s.geocode.provider === 'proposer'
            ? 'proposer'
            : 'address',
    };
  }

  // El resto apunta a un local publicado. Si ya no existe, se ve igualmente
  // la solicitud, sin los datos del local.
  const place = {
    name: target?.name ?? '',
    neighborhood: target?.address.neighborhood ?? target?.address.city ?? '',
    address: target ? join(target.address.street, target.address.city) : '',
    restaurantSlug: target?.slug,
  };

  if (s.type === 'edit') {
    const p = s.payload as unknown as CorrectionPayload;
    return {
      ...base,
      ...place,
      correction: {
        kind: p.kind,
        before: p.kind === 'address' ? target?.address.street : undefined,
        after: p.details,
      },
    };
  }
  if (s.type === 'removal') {
    const p = s.payload as unknown as RemovalPayload;
    return {
      ...base,
      ...place,
      removal: { what: p.what, details: p.details },
    };
  }
  const p = s.payload as unknown as TeamPayload;
  return {
    ...base,
    ...place,
    team: {
      level: p.level,
      totalStaff: p.summary.totalStaff,
      staffWithDisability: p.summary.staffWithDisability,
      areas: p.areas,
      disabilityTypes: p.disabilityTypes,
      stories: p.stories?.length ?? 0,
      ...(withStories && p.stories?.length
        ? {
            storyTexts: p.stories.map(
              ({ displayName, role, storyText, consentBy, photoKey }) => ({
                displayName,
                role,
                storyText,
                consentBy,
                ...(waiting && quarantineKey.safeParse(photoKey).success
                  ? { photo: quarantinePhoto(apiUrl, String(s._id), photoKey!) }
                  : {}),
              }),
            ),
          }
        : {}),
    },
  };
}
