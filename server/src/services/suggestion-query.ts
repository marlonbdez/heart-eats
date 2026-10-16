import { z } from 'zod';
import { ApiError } from '../errors.js';
import type { ModerationScope } from '../models/user.js';
import { suggestionTypes } from '../models/suggestion.js';
import { normalize } from '../text.js';
import { parseOrThrow } from '../validation.js';

export const QUEUE_DEFAULT_LIMIT = 20;
export const QUEUE_MAX_LIMIT = 50;

// `resolved` agrupa lo ya decidido.
export const queueStatuses = ['pending', 'info_requested', 'resolved'] as const;

const querySchema = z.object({
  status: z.enum(queueStatuses).default('pending'),
  type: z.enum(suggestionTypes).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(QUEUE_MAX_LIMIT)
    .default(QUEUE_DEFAULT_LIMIT),
  cursor: z.string().max(100).optional(),
});

export interface QueueCursor {
  at: Date;
  id: string;
}

export interface QueueQuery {
  status: (typeof queueStatuses)[number];
  type?: (typeof suggestionTypes)[number];
  limit: number;
  cursor?: QueueCursor;
}

// Opaco para quien llama: fecha y id de la última solicitud vista.
export const encodeQueueCursor = ({ at, id }: QueueCursor) =>
  Buffer.from(JSON.stringify({ t: at.getTime(), i: id })).toString('base64url');

export function decodeQueueCursor(cursor: string): QueueCursor | null {
  try {
    const { t, i } = JSON.parse(Buffer.from(cursor, 'base64url').toString());
    if (
      !Number.isFinite(t) ||
      typeof i !== 'string' ||
      !objectIdPattern.test(i)
    )
      return null;
    return { at: new Date(t), id: i };
  } catch {
    return null;
  }
}

export const objectIdPattern = /^[0-9a-f]{24}$/;

export function parseQueueQuery(query: unknown): QueueQuery {
  const { cursor, ...rest } = parseOrThrow(querySchema, query);
  if (cursor === undefined) return rest;
  const decoded = decodeQueueCursor(cursor);
  if (!decoded) {
    throw new ApiError(422, 'validation_failed', 'cursor no es válido', [
      { path: 'cursor', code: 'custom', message: 'cursor no es válido' },
    ]);
  }
  return { ...rest, cursor: decoded };
}

// Estados de la base de datos que cubre cada pestaña de la cola.
export const statusesOf = (status: QueueQuery['status']) =>
  status === 'resolved' ? ['approved', 'rejected'] : [status];

// Filtro de Mongo con lo que puede ver quien modera (ADR 0008). Los locales
// nuevos se ubican por ciudad; las demás solicitudes, por el local al que
// apuntan. `scopedRestaurantIds` son los locales que caen en su ámbito.
// Hoy una propuesta no lleva país, así que un ámbito de solo país ve todas
// las propuestas.
export function scopeFilter(
  scope: readonly ModerationScope[],
  scopedRestaurantIds: readonly unknown[],
): Record<string, unknown> {
  if (scope.length === 0) return { _id: { $in: [] } }; // nada

  const cities = scope.map((s) => (s.city ? normalize(s.city) : null));
  const newOnes = cities.includes(null)
    ? { type: 'new' }
    : { type: 'new', cityKey: { $in: cities } };

  return {
    $or: [
      newOnes,
      {
        type: { $ne: 'new' },
        targetRestaurantId: { $in: scopedRestaurantIds },
      },
    ],
  };
}

// Condición de los locales que entran en el ámbito, para buscar sus ids.
export const restaurantScopeFilter = (scope: readonly ModerationScope[]) => ({
  $or: scope.map((s) => ({
    'address.country': s.country,
    ...(s.city ? { cityKey: normalize(s.city) } : {}),
  })),
});
