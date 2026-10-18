import { getRegions, getRestaurants } from './data';
import type { RegionCountry, Restaurant } from './types';
import { defaultZone } from './zone';

// Las regiones se piden una vez por visita y se comparten entre el selector de
// zona y «Cerca de mí». Si la petición falla, la siguiente vuelve a intentarlo.
let pending: Promise<RegionCountry[]> | null = null;

export function loadRegions(): Promise<RegionCountry[]> {
  pending ??= getRegions().catch((err) => {
    pending = null;
    throw err;
  });
  return pending;
}

// Los locales de la zona por defecto, para los formularios que eligen un local
// de una lista. Aún no escalan a todo el mundo: quedan pendientes de un
// selector con búsqueda (docs/05_ROADMAP.md, fase 3b).
export async function loadDefaultZoneRestaurants(): Promise<Restaurant[]> {
  const zone = defaultZone(await loadRegions());
  return zone ? getRestaurants(zone) : [];
}
