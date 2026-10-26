import type { RestaurantRecord } from '../models/restaurant.js';
import type { TeamRecord } from '../models/team.js';
import type { PublicRestaurant } from '../types.js';
import { photoUrls } from './photo-keys.js';
import { timezoneOf } from './timezone.js';
import { publicTeam } from './team-privacy.js';

// Una verificación de más de 12 meses pide revisión (calculado, no guardado).
export function needsReview(lastVerifiedAt: Date, now: Date = new Date()) {
  const limit = new Date(now);
  limit.setMonth(limit.getMonth() - 12);
  return lastVerifiedAt < limit;
}

// De un local de la base de datos a lo que ve el público: sin identificadores
// internos, sin estado de moderación y con el equipo ya filtrado por privacidad.
// `team` solo se pasa en la ficha; en las listas no se manda.
export interface PublicOptions {
  // Origen de la API, para componer las direcciones de las fotos.
  apiUrl?: string;
  // Todas las fotos (ficha) o solo la portada (listas).
  allPhotos?: boolean;
}

export function toPublicRestaurant(
  r: RestaurantRecord,
  team?: TeamRecord | null,
  now: Date = new Date(),
  { apiUrl, allPhotos = false }: PublicOptions = {},
): PublicRestaurant {
  const urls = photoUrls(apiUrl);
  const photos = (allPhotos ? r.photos : r.photos?.slice(0, 1)) ?? [];
  const [lng, lat] = r.location.coordinates;
  const { level, method, lastVerifiedAt } = r.verification;
  const timezone = timezoneOf(lat, lng);

  const publicTeamData = team
    ? publicTeam(team, r.ownerConfirmedAt, apiUrl)
    : undefined;

  return {
    slug: r.slug,
    name: r.name,
    ...(r.description ? { description: r.description } : {}),
    businessType: r.businessType,
    cuisineTypes: r.cuisineTypes,
    foodTags: r.foodTags,
    address: {
      street: r.address.street,
      ...(r.address.postalCode ? { postalCode: r.address.postalCode } : {}),
      ...(r.address.neighborhood
        ? { neighborhood: r.address.neighborhood }
        : {}),
      city: r.address.city,
      ...(r.address.region ? { region: r.address.region } : {}),
      country: r.address.country,
    },
    location: { lat, lng },
    contact: {
      ...(r.contact?.phone ? { phone: r.contact.phone } : {}),
      ...(r.contact?.email ? { email: r.contact.email } : {}),
      ...(r.contact?.website ? { website: r.contact.website } : {}),
      ...(r.contact?.instagram ? { instagram: r.contact.instagram } : {}),
    },
    openingHours: r.openingHours.map(({ day, open, close }) => ({
      day,
      open,
      close,
    })),
    ...(timezone ? { timezone } : {}),
    ...(r.priceRange ? { priceRange: r.priceRange } : {}),
    ...(r.menuUrl ? { menuUrl: r.menuUrl } : {}),
    signatureDishes: r.signatureDishes.map(
      ({ name, description, photoUrl, photo }) => ({
        name,
        ...(description ? { description } : {}),
        // La foto subida a HeartEats manda sobre una dirección externa.
        ...(photo
          ? { photoUrl: urls.photo(photo), thumbUrl: urls.thumb(photo) }
          : photoUrl
            ? { photoUrl }
            : {}),
      }),
    ),
    ...(photos.length > 0
      ? {
          photos: photos.map(({ file, alt }) => ({
            url: urls.photo(file),
            thumbUrl: urls.thumb(file),
            ...(alt ? { alt } : {}),
          })),
        }
      : {}),
    ...(publicTeamData ? { team: publicTeamData } : {}),
    ...(r.ownerConfirmedAt
      ? { ownerConfirmedAt: r.ownerConfirmedAt.toISOString() }
      : {}),
    verification: {
      level: level as 'community' | 'admin',
      method: method as string,
      lastVerifiedAt: (lastVerifiedAt as Date).toISOString(),
      needsReview: needsReview(lastVerifiedAt as Date, now),
    },
    ...(r.isDemo ? { isDemo: true as const } : {}),
  };
}
