import { Restaurant } from '../src/models/restaurant.js';
import { Team } from '../src/models/team.js';

export type SeedEntry = Record<string, unknown> & {
  team?: Record<string, unknown>;
};

export interface RefreshResult {
  created: number;
  updated: number;
  // Su slug ya lo usa un local que no es de ejemplo: no se toca.
  skipped: string[];
}

// Pone al día los locales de ejemplo en su sitio, por slug, sin borrar nada:
// los demás locales de ejemplo (por ejemplo, los de `seed:stress`) y los reales
// quedan como están. Un local de ejemplo que falta se crea con su equipo.
export async function refreshDemoPlaces(
  entries: SeedEntry[],
): Promise<RefreshResult> {
  const result: RefreshResult = { created: 0, updated: 0, skipped: [] };
  for (const { team, ...data } of entries) {
    const slug = String(data.slug);
    const existing = await Restaurant.findOne({ slug });
    if (existing && !existing.isDemo) {
      result.skipped.push(slug);
    } else if (existing) {
      // `save()` recalcula la búsqueda y la ciudad sin acentos.
      existing.set(data);
      await existing.save();
      result.updated++;
    } else {
      const restaurant = await Restaurant.create(data);
      if (team) await Team.create({ ...team, restaurantId: restaurant._id });
      result.created++;
    }
  }
  return result;
}
