import { getRestaurants } from '@/lib/data';
import type { PlaceOption } from '@/components/BusinessForm';

// Los locales entre los que el negocio elige el suyo, por orden alfabético.
export async function getPlaceOptions(locale: string): Promise<PlaceOption[]> {
  const all = await getRestaurants();
  return all
    .map((r) => ({
      slug: r.slug,
      name: r.name,
      neighborhood: r.address.neighborhood,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}
