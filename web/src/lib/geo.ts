import { coverage } from './map-config';

export interface Position {
  lat: number;
  lng: number;
}

// Distancia en metros entre dos puntos (fórmula de Haversine).
export function distanceMeters(a: Position, b: Position): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) *
      Math.cos(rad(b.lat)) *
      Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

export function isInCoverage(p: Position): boolean {
  const [lng, lat] = coverage.center;
  return distanceMeters(p, { lat, lng }) <= coverage.radiusKm * 1000;
}

export function sortByDistance<T extends { location: Position }>(
  items: T[],
  from: Position,
): T[] {
  return [...items].sort(
    (a, b) =>
      distanceMeters(from, a.location) - distanceMeters(from, b.location),
  );
}
