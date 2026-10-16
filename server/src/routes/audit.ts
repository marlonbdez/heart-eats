import { Router } from 'express';
import { Types } from 'mongoose';
import { ApiError } from '../errors.js';
import { authOf, requireSession } from '../middleware/session.js';
import { AuditLog, type AuditLogRecord } from '../models/audit-log.js';
import { User } from '../models/user.js';
import { parseAuditQuery } from '../services/audit-query.js';
import { encodeQueueCursor } from '../services/suggestion-query.js';

// Quién hizo cada cosa, por su correo. Quien ya no existe se queda sin él.
async function emailsOf(lines: readonly AuditLogRecord[]) {
  const ids = [
    ...new Set(lines.flatMap((l) => (l.actorId ? [String(l.actorId)] : []))),
  ];
  if (ids.length === 0) return new Map<string, string>();
  const users = await User.find({ _id: { $in: ids } })
    .select('email')
    .lean<{ _id: Types.ObjectId; email: string }[]>();
  return new Map(users.map((u) => [String(u._id), u.email]));
}

export function auditRouter({
  allowedOrigins,
}: {
  allowedOrigins: readonly string[];
}) {
  const router = Router();

  // El registro de lo que se ha hecho, de lo más reciente a lo más antiguo.
  // Solo lo lee un administrador (ADR 0008). Las líneas no llevan nombres,
  // textos ni correos de quien envió algo: solo qué cambió y quién lo hizo.
  router.get('/audit', ...requireSession(allowedOrigins), async (req, res) => {
    if (authOf(res).role !== 'admin') {
      throw new ApiError(
        403,
        'forbidden',
        'El registro solo lo lee un administrador',
      );
    }
    const query = parseAuditQuery(req.query);

    const conditions: Record<string, unknown>[] = [];
    if (query.entity) conditions.push({ entity: query.entity });
    if (query.entityId) conditions.push({ entityId: query.entityId });
    if (query.cursor) {
      const { at, id } = query.cursor;
      conditions.push({
        $or: [
          { at: { $lt: at } },
          { at, _id: { $lt: new Types.ObjectId(id) } },
        ],
      });
    }

    const records = await AuditLog.find(
      conditions.length ? { $and: conditions } : {},
    )
      .sort({ at: -1, _id: -1 })
      .limit(query.limit + 1)
      .lean<AuditLogRecord[]>();

    const page = records.slice(0, query.limit);
    const emails = await emailsOf(page);
    const last = page.at(-1);

    res.set('Cache-Control', 'no-store').json({
      items: page.map((l) => ({
        id: String(l._id),
        entity: l.entity,
        entityId: String(l.entityId),
        action: l.action,
        at: l.at.toISOString(),
        ...(l.actorId
          ? {
              actorId: String(l.actorId),
              ...(emails.has(String(l.actorId))
                ? { actor: emails.get(String(l.actorId)) }
                : {}),
            }
          : {}),
        ...(l.diff ? { diff: l.diff } : {}),
      })),
      ...(records.length > query.limit && last
        ? {
            nextCursor: encodeQueueCursor({
              at: last.at,
              id: String(last._id),
            }),
          }
        : {}),
    });
  });

  return router;
}
