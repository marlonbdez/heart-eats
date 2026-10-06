// Capa de datos de la web. Hoy lee mocks; cuando exista el backend solo
// cambia la implementación de estas funciones (fetch a /api/v1), no las pantallas.
import type { FoodTag, Restaurant, RestaurantQuery } from '../types';
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
