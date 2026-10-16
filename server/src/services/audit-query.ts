import { z } from 'zod';
import { ApiError } from '../errors.js';
import { auditEntities } from '../models/audit-log.js';
import { parseOrThrow } from '../validation.js';
import { decodeQueueCursor, objectIdPattern } from './suggestion-query.js';
import type { QueueCursor } from './suggestion-query.js';

export const AUDIT_DEFAULT_LIMIT = 50;
export const AUDIT_MAX_LIMIT = 200;

const querySchema = z.object({
  entity: z.enum(auditEntities).optional(),
  entityId: z.string().regex(objectIdPattern).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(AUDIT_MAX_LIMIT)
    .default(AUDIT_DEFAULT_LIMIT),
  cursor: z.string().max(100).optional(),
});

export interface AuditQuery {
  entity?: (typeof auditEntities)[number];
  entityId?: string;
  limit: number;
  cursor?: QueueCursor;
}

export function parseAuditQuery(query: unknown): AuditQuery {
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
