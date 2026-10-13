import type { RestaurantRecord } from '../models/restaurant.js';
import type { TeamRecord } from '../models/team.js';
import type { PublicRestaurant } from '../types.js';
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
export function toPublicRestaurant(
  r: RestaurantRecord,
  team?: TeamRecord | null,
  now: Date = new Date(),
): PublicRestaurant {
  const [lng, lat] = r.location.coordinates;
  const { level, method, lastVerifiedAt } = r.verification;

  const publicTeamData = team
    ? publicTeam(team, r.ownerConfirmedAt)
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
    signatureDishes: r.signatureDishes.map(
      ({ name, description, photoUrl }) => ({
        name,
        ...(description ? { description } : {}),
        ...(photoUrl ? { photoUrl } : {}),
      }),
    ),
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
