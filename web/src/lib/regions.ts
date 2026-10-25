import { getRegions } from './data';
import type { RegionCountry } from './types';

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
