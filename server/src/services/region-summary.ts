import { Restaurant } from '../models/restaurant.js';
import type { Bbox } from './restaurant-query.js';
import { visibleFilter } from './restaurant-query.js';

export interface RegionCity {
  key: string;
  name: string;
  count: number;
  bbox: Bbox;
  center: { lat: number; lng: number };
}

export interface RegionCountry {
  code: string;
  count: number;
  bbox: Bbox;
  cities: RegionCity[];
}

interface CityRow {
  _id: { country: string; cityKey: string };
  name: string;
  count: number;
  west: number;
  south: number;
  east: number;
  north: number;
  lat: number;
  lng: number;
}

const round = (n: number) => Number(n.toFixed(5));

// Dónde hay locales publicados: países y ciudades con su número y su
// rectángulo, para que la web ofrezca solo zonas que no estén vacías. Los
// nombres van como están guardados (en el idioma local de cada sitio).
// Un país que cruza el antimeridiano sale con un rectángulo que lo abarca todo.
export async function summarizeRegions(): Promise<RegionCountry[]> {
  const rows = await Restaurant.aggregate<CityRow>([
    { $match: visibleFilter },
    {
      $group: {
        _id: { country: '$address.country', cityKey: '$cityKey' },
        name: { $min: '$address.city' },
        count: { $sum: 1 },
        west: { $min: { $arrayElemAt: ['$location.coordinates', 0] } },
        east: { $max: { $arrayElemAt: ['$location.coordinates', 0] } },
        south: { $min: { $arrayElemAt: ['$location.coordinates', 1] } },
        north: { $max: { $arrayElemAt: ['$location.coordinates', 1] } },
        lng: { $avg: { $arrayElemAt: ['$location.coordinates', 0] } },
        lat: { $avg: { $arrayElemAt: ['$location.coordinates', 1] } },
      },
    },
  ]);
  return groupByCountry(rows);
}

// Aparte de la consulta para poder probarlo sin base de datos.
export function groupByCountry(rows: CityRow[]): RegionCountry[] {
  const countries = new Map<string, RegionCountry>();
  for (const row of rows) {
    const bbox = {
      west: round(row.west),
      south: round(row.south),
      east: round(row.east),
      north: round(row.north),
    };
    const city: RegionCity = {
      key: row._id.cityKey,
      name: row.name,
      count: row.count,
      bbox,
      center: { lat: round(row.lat), lng: round(row.lng) },
    };
    const country = countries.get(row._id.country);
    if (!country) {
      countries.set(row._id.country, {
        code: row._id.country,
        count: row.count,
        bbox: { ...bbox },
        cities: [city],
      });
      continue;
    }
    country.count += row.count;
    country.bbox = {
      west: Math.min(country.bbox.west, bbox.west),
      south: Math.min(country.bbox.south, bbox.south),
      east: Math.max(country.bbox.east, bbox.east),
      north: Math.max(country.bbox.north, bbox.north),
    };
    country.cities.push(city);
  }
  // Más locales primero; a igualdad, por nombre/código (orden estable).
  return [...countries.values()]
    .map((c) => ({
      ...c,
      cities: c.cities.sort(
        (a, b) => b.count - a.count || a.key.localeCompare(b.key),
      ),
    }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
}
