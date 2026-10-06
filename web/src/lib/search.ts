// Lógica de búsqueda y filtrado, sin dependencias de React. La usa la capa de
// datos (hoy mocks; con backend, la API aplicará lo mismo) y la pantalla.
import type { Restaurant, RestaurantQuery } from './types';

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();

// El buscador encuentra sitios: nombre del local, barrio, ciudad y código postal.
export function matchesQuery(r: Restaurant, query: RestaurantQuery): boolean {
  if (query.food?.length && !query.food.some((f) => r.foodTags.includes(f))) {
    return false;
  }
  const q = query.q ? normalize(query.q) : '';
  if (!q) return true;
  const haystack = normalize(
    [r.name, r.address.neighborhood, r.address.city, r.address.postalCode]
      .filter(Boolean)
      .join(' '),
  );
  return haystack.includes(q);
}

// Si lo escrito parece una categoría de comida (p. ej. "piz" → Pizza), se
// ofrece como atajo. Mínimo 2 letras para no sugerir con cada pulsación.
export function matchFoodTags<T extends { label: string }>(
  text: string,
  tags: T[],
): T[] {
  const q = normalize(text);
  if (q.length < 2) return [];
  return tags.filter((tag) => normalize(tag.label).includes(q));
}
