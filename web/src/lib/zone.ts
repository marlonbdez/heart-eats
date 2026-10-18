// Lógica de zonas, sin React: de /regions a la ciudad que se mira. La zona va
// en la dirección (?country=ES&city=madrid) y, si no hay ninguna, se usa la
// ciudad con más locales.
import { distanceMeters, type Position } from './geo';
import type { Bbox, RegionCity, RegionCountry, Zone } from './types';

// «Cerca de mí» solo cambia de zona si hay locales a menos de esta distancia.
export const NEAR_KM = 60;

export function findCity(
  regions: RegionCountry[],
  zone: Zone,
): RegionCity | undefined {
  return regions
    .find((c) => c.code === zone.country)
    ?.cities.find((c) => c.key === zone.city);
}

// La ciudad con más locales (la API ya las ordena así).
export function defaultZone(regions: RegionCountry[]): Zone | null {
  const country = regions[0];
  const city = country?.cities[0];
  return country && city ? { country: country.code, city: city.key } : null;
}

// La zona de la dirección, si existe de verdad; si no, null.
export function zoneFromSearch(
  search: string,
  regions: RegionCountry[],
): Zone | null {
  const params = new URLSearchParams(search);
  const country = params.get('country')?.toUpperCase();
  const city = params.get('city');
  if (!country || !city) return null;
  const zone = { country, city };
  return findCity(regions, zone) ? zone : null;
}

export function sameZone(a: Zone | null, b: Zone | null): boolean {
  return a?.country === b?.country && a?.city === b?.city;
}

// La ciudad con locales más cercana a un punto, con su distancia.
export function nearestCity(
  regions: RegionCountry[],
  point: Position,
): { zone: Zone; km: number } | null {
  let best: { zone: Zone; km: number } | null = null;
  for (const country of regions) {
    for (const city of country.cities) {
      const km = distanceMeters(point, city.center) / 1000;
      if (!best || km < best.km) {
        best = { zone: { country: country.code, city: city.key }, km };
      }
    }
  }
  return best;
}

// Rectángulo para encuadrar una ciudad: nunca más pequeño que unas calles,
// aunque solo tenga un local.
const MIN_SPAN = 0.02;
export function viewBounds(bbox: Bbox): [[number, number], [number, number]] {
  const padLng = Math.max(0, (MIN_SPAN - (bbox.east - bbox.west)) / 2);
  const padLat = Math.max(0, (MIN_SPAN - (bbox.north - bbox.south)) / 2);
  return [
    [bbox.west - padLng, bbox.south - padLat],
    [bbox.east + padLng, bbox.north + padLat],
  ];
}
