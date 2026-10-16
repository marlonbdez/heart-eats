import { z } from 'zod';
import { publicVerificationLevels } from '../catalog.js';
import { ApiError } from '../errors.js';
import { escapeRegex, normalize } from '../text.js';
import { parseOrThrow } from '../validation.js';

export const LIST_DEFAULT_LIMIT = 50;
export const LIST_MAX_LIMIT = 100;
export const GEOJSON_MAX_POINTS = 1000;

export interface Bbox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface ListQuery {
  bbox?: Bbox;
  near?: { lat: number; lng: number };
  country?: string;
  city?: string;
  q?: string;
  food?: string[];
  limit: number;
  offset: number;
}

// El cursor es opaco para quien llama: hoy codifica un desplazamiento.
export function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ o: offset })).toString('base64url');
}

export function decodeCursor(cursor: string): number | null {
  try {
    const { o } = JSON.parse(Buffer.from(cursor, 'base64url').toString());
    return Number.isInteger(o) && o >= 0 ? o : null;
  } catch {
    return null;
  }
}

const numbers = (value: string, count: number) => {
  const parts = value.split(',').map((p) => p.trim());
  if (parts.length !== count || parts.some((p) => p === '')) return null;
  const nums = parts.map(Number);
  return nums.every(Number.isFinite) ? nums : null;
};

const bboxParam = z.string().transform((value, ctx): Bbox => {
  const nums = numbers(value, 4);
  if (nums) {
    const [west, south, east, north] = nums as [number, number, number, number];
    const lngOk = [west, east].every((n) => n >= -180 && n <= 180);
    const latOk = [south, north].every((n) => n >= -90 && n <= 90);
    if (lngOk && latOk && south <= north) return { west, south, east, north };
  }
  ctx.addIssue({
    code: 'custom',
    message: 'bbox debe ser «oeste,sur,este,norte» con coordenadas válidas',
  });
  return z.NEVER;
});

const nearParam = z.string().transform((value, ctx) => {
  const nums = numbers(value, 2);
  if (nums) {
    const [lat, lng] = nums as [number, number];
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }
  ctx.addIssue({
    code: 'custom',
    message: 'near debe ser «lat,lng» con coordenadas válidas',
  });
  return z.NEVER;
});

const foodParam = z
  .union([z.string(), z.array(z.string())])
  .transform((value, ctx) => {
    const keys = [value]
      .flat()
      .flatMap((v) => v.split(','))
      .map((v) => v.trim())
      .filter(Boolean);
    if (keys.length > 10 || keys.some((k) => !/^[a-z0-9_]+$/.test(k))) {
      ctx.addIssue({ code: 'custom', message: 'food no es válido' });
      return z.NEVER;
    }
    return keys;
  });

const listSchema = z.object({
  bbox: bboxParam.optional(),
  near: nearParam.optional(),
  country: z
    .string()
    .regex(/^[A-Za-z]{2}$/, 'country debe ser un código ISO de 2 letras')
    .transform((v) => v.toUpperCase())
    .optional(),
  city: z.string().trim().min(1).max(100).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  food: foodParam.optional(),
  limit: z.coerce.number().int().min(1).max(LIST_MAX_LIMIT).optional(),
  cursor: z.string().max(100).optional(),
});

// Valida los parámetros de GET /restaurants y /restaurants/geojson. Los locales
// nunca se piden «todos»: hace falta alguna zona (bbox, near, country o city).
export function parseListQuery(raw: unknown): ListQuery {
  const p = parseOrThrow(listSchema, raw);

  if (!p.bbox && !p.near && !p.country && !p.city) {
    throw new ApiError(
      400,
      'zone_required',
      'Indica una zona: bbox, near, country o city',
    );
  }
  if (p.bbox && p.near) {
    throw new ApiError(400, 'invalid_zone', 'Usa bbox o near, no los dos');
  }

  let offset = 0;
  if (p.cursor !== undefined) {
    const decoded = decodeCursor(p.cursor);
    if (decoded === null) {
      throw new ApiError(422, 'validation_failed', 'cursor no es válido', [
        { path: 'cursor', code: 'custom', message: 'cursor no es válido' },
      ]);
    }
    offset = decoded;
  }

  return {
    ...(p.bbox ? { bbox: p.bbox } : {}),
    ...(p.near ? { near: p.near } : {}),
    ...(p.country ? { country: p.country } : {}),
    ...(p.city ? { city: p.city } : {}),
    ...(p.q ? { q: p.q } : {}),
    ...(p.food?.length ? { food: p.food } : {}),
    limit: p.limit ?? LIST_DEFAULT_LIMIT,
    offset,
  };
}

// Forma válida de un slug (también lo usan los envíos que apuntan a un local).
export const slugPattern = /^[a-z0-9-]{1,80}$/;

// Lo que cualquiera puede ver: publicado y con verificación pública.
export const visibleFilter = {
  status: 'published',
  'verification.level': { $in: [...publicVerificationLevels] },
} as const;

// Filtro de MongoDB. El rectángulo se expresa con rangos sobre las coordenadas
// (exacto y sin ambigüedades en el antimeridiano). Cuando haya decenas de miles
// de locales por consulta habrá que apoyarse en el índice 2dsphere.
export function buildFilter(query: ListQuery): Record<string, unknown> {
  const filter: Record<string, unknown> = { ...visibleFilter };

  if (query.bbox) {
    const { west, south, east, north } = query.bbox;
    filter['location.coordinates.1'] = { $gte: south, $lte: north };
    if (west <= east) {
      filter['location.coordinates.0'] = { $gte: west, $lte: east };
    } else {
      // El rectángulo cruza el antimeridiano (±180°).
      filter.$or = [
        { 'location.coordinates.0': { $gte: west } },
        { 'location.coordinates.0': { $lte: east } },
      ];
    }
  }

  if (query.near) {
    filter.location = {
      $nearSphere: {
        $geometry: {
          type: 'Point',
          coordinates: [query.near.lng, query.near.lat],
        },
      },
    };
  }

  if (query.country) filter['address.country'] = query.country;
  if (query.city) filter.cityKey = normalize(query.city);
  if (query.food) filter.foodTags = { $in: query.food };
  if (query.q) filter.searchText = { $regex: escapeRegex(normalize(query.q)) };

  return filter;
}
