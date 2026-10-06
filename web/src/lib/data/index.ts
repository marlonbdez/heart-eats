// Capa de datos de la web. Hoy lee mocks; cuando exista el backend solo
// cambia la implementación de estas funciones (fetch a /api/v1), no las pantallas.
import type { FoodTag, Restaurant, RestaurantQuery } from '../types';
import { foodTags, restaurants } from './mock-restaurants';

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

export async function getRestaurants(
  query: RestaurantQuery = {},
): Promise<Restaurant[]> {
  const q = query.q ? normalize(query.q.trim()) : '';
  return restaurants.filter((r) => {
    if (query.food?.length && !query.food.some((f) => r.foodTags.includes(f))) {
      return false;
    }
    if (!q) return true;
    const haystack = normalize(
      [r.name, r.address.neighborhood, r.address.city, r.address.postalCode]
        .filter(Boolean)
        .join(' '),
    );
    return haystack.includes(q);
  });
}

export async function getRestaurant(slug: string): Promise<Restaurant | null> {
  return restaurants.find((r) => r.slug === slug) ?? null;
}

export async function getFoodTags(): Promise<FoodTag[]> {
  return foodTags;
}
