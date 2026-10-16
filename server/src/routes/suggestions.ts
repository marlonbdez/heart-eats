import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { Types } from 'mongoose';
import { ApiError } from '../errors.js';
import { authOf, requireSession } from '../middleware/session.js';
import { AuditLog } from '../models/audit-log.js';
import { Restaurant } from '../models/restaurant.js';
import { Suggestion, type SuggestionRecord } from '../models/suggestion.js';
import type { ModerationScope } from '../models/user.js';
import { decisionSchema } from '../services/decision-input.js';
import type { Mailer } from '../services/mailer.js';
import {
  toModerationItem,
  type TargetRestaurant,
} from '../services/moderation-item.js';
import { REPLY_DAYS, signReplyToken } from '../services/reply-token.js';
import {
  encodeQueueCursor,
  objectIdPattern,
  parseQueueQuery,
  restaurantScopeFilter,
  scopeFilter,
  statusesOf,
} from '../services/suggestion-query.js';
import { parseOrThrow } from '../validation.js';

interface SuggestionsOptions {
  allowedOrigins: readonly string[];
  mailer: Mailer;
  // Base de los enlaces del correo (la web, no la API).
  webUrl: string;
  replyTokenSecret: string;
}

// Lo que tocan a personas del equipo: lo decide un administrador (ADR 0008).
const adminOnlyTypes = new Set<SuggestionRecord['type']>(['team', 'removal']);

// Solicitudes que caen en el ámbito de quien modera.
async function inScope(scope: readonly ModerationScope[]) {
  if (scope.length === 0) return scopeFilter(scope, []);
  const ids = await Restaurant.find(restaurantScopeFilter(scope)).distinct(
    '_id',
  );
  return scopeFilter(scope, ids);
}

// Los locales a los que apuntan las solicitudes, en una sola consulta.
async function loadTargets(records: readonly SuggestionRecord[]) {
  const ids = records.flatMap((r) =>
    r.targetRestaurantId ? [r.targetRestaurantId] : [],
  );
  if (ids.length === 0) return new Map<string, TargetRestaurant>();
  const places = await Restaurant.find({ _id: { $in: ids } })
    .select('slug name address')
    .lean<TargetRestaurant[]>();
  return new Map(places.map((p) => [String(p._id), p]));
}

// Una solicitud de las que ve quien modera. Fuera del ámbito se responde igual
// que si no existiera.
async function findVisible(id: string, scope: readonly ModerationScope[]) {
  const record = objectIdPattern.test(id)
    ? await Suggestion.findOne({
        $and: [{ _id: id }, await inScope(scope)],
      }).lean<SuggestionRecord>()
    : null;
  if (!record) throw new ApiError(404, 'not_found', 'Solicitud no encontrada');
  return record;
}

// Otra persona decidió entre la lectura y la escritura.
const changed = () =>
  new ApiError(
    409,
    'conflict',
    'La solicitud acaba de cambiar; vuelve a abrirla',
  );

export function suggestionsRouter({
  allowedOrigins,
  mailer,
  webUrl,
  replyTokenSecret,
}: SuggestionsOptions) {
  const router = Router();
  const auth = requireSession(allowedOrigins);

  // La cola: lo pendiente va de la más antigua a la más reciente (se atiende
  // por orden de llegada); lo resuelto, al revés.
  router.get('/suggestions', ...auth, async (req, res) => {
    const query = parseQueueQuery(req.query);
    const direction = query.status === 'resolved' ? -1 : 1;
    const op = direction === 1 ? '$gt' : '$lt';

    const conditions: Record<string, unknown>[] = [
      await inScope(authOf(res).moderationScope),
      { status: { $in: statusesOf(query.status) } },
    ];
    if (query.type) conditions.push({ type: query.type });
    if (query.cursor) {
      const { at, id } = query.cursor;
      conditions.push({
        $or: [
          { createdAt: { [op]: at } },
          { createdAt: at, _id: { [op]: new Types.ObjectId(id) } },
        ],
      });
    }

    const records = await Suggestion.find({ $and: conditions })
      .sort({ createdAt: direction, _id: direction })
      .limit(query.limit + 1)
      .lean<SuggestionRecord[]>();

    const page = records.slice(0, query.limit);
    const targets = await loadTargets(page);
    const last = page.at(-1);

    res.set('Cache-Control', 'no-store').json({
      items: page.map((r) =>
        toModerationItem(r, targets.get(String(r.targetRestaurantId))),
      ),
      ...(records.length > query.limit && last
        ? {
            nextCursor: encodeQueueCursor({
              at: last.createdAt,
              id: String(last._id),
            }),
          }
        : {}),
    });
  });

  // Una solicitud.
  router.get('/suggestions/:id', ...auth, async (req, res) => {
    const record = await findVisible(
      String(req.params.id),
      authOf(res).moderationScope,
    );
    const targets = await loadTargets([record]);
    res
      .set('Cache-Control', 'no-store')
      .json(
        toModerationItem(
          record,
          targets.get(String(record.targetRestaurantId)),
        ),
      );
  });

  // Rechazar o pedir información. Aprobar (publicar la ficha) llega aparte.
  router.post('/suggestions/:id/decision', ...auth, async (req, res) => {
    const user = authOf(res);
    const record = await findVisible(
      String(req.params.id),
      user.moderationScope,
    );
    if (adminOnlyTypes.has(record.type) && user.role !== 'admin') {
      throw new ApiError(
        403,
        'forbidden',
        'Esta solicitud solo la decide un administrador',
      );
    }
    const decision = parseOrThrow(decisionSchema, req.body);
    if (decision.action === 'approve') {
      throw new ApiError(
        501,
        'not_implemented',
        'Aprobar aún no está disponible',
      );
    }
    if (record.status === 'approved' || record.status === 'rejected') {
      throw new ApiError(
        409,
        'already_resolved',
        'La solicitud ya está resuelta',
      );
    }

    const now = new Date();
    const audit = (action: string, diff: Record<string, unknown>) =>
      AuditLog.create({
        entity: 'suggestion',
        entityId: record._id,
        action,
        actorId: new Types.ObjectId(user.id),
        diff,
      });

    let updated: SuggestionRecord | null;
    if (decision.action === 'reject') {
      // El correo ya no hace falta: se borra al resolver (docs/08) y el enlace
      // de respuesta, si lo había, deja de valer.
      updated = await Suggestion.findOneAndUpdate(
        { _id: record._id, status: { $in: ['pending', 'info_requested'] } },
        {
          $set: {
            status: 'rejected',
            resolution: {
              reason: decision.reason,
              note: decision.note,
              decidedBy: user.id,
              decidedAt: now,
            },
          },
          $unset: { contactEmail: 1, 'infoRequest.nonce': 1 },
        },
        { returnDocument: 'after' },
      ).lean<SuggestionRecord>();
      if (!updated) throw changed();
      await audit('reject', {
        status: { from: record.status, to: 'rejected' },
        reason: decision.reason,
      });
    } else {
      const to = record.contactEmail;
      if (!to) {
        throw new ApiError(
          409,
          'no_contact',
          'Quien propuso no dejó un correo: solo se puede rechazar',
        );
      }
      if (record.status !== 'pending') {
        throw new ApiError(
          409,
          'info_already_requested',
          'Ya se pidió información en esta solicitud',
        );
      }
      const deadline = new Date(now.getTime() + REPLY_DAYS * 24 * 60 * 60_000);
      const nonce = randomBytes(16).toString('base64url');
      updated = await Suggestion.findOneAndUpdate(
        { _id: record._id, status: 'pending' },
        {
          $set: {
            status: 'info_requested',
            infoRequest: {
              note: decision.note,
              requestedAt: now,
              deadline,
              nonce,
            },
          },
        },
        { returnDocument: 'after' },
      ).lean<SuggestionRecord>();
      if (!updated) throw changed();

      const token = signReplyToken(replyTokenSecret, {
        suggestionId: String(record._id),
        expiresAt: deadline,
        nonce,
      });
      try {
        await mailer.sendInfoRequest({
          to,
          url: `${webUrl}/${record.locale}/reply#token=${token}`,
          note: decision.note,
          deadline,
          locale: record.locale,
        });
      } catch (err) {
        // Sin correo no hay petición: vuelve a la cola como estaba. Se anota
        // el fallo sin la dirección.
        await Suggestion.updateOne(
          { _id: record._id },
          { $set: { status: 'pending' }, $unset: { infoRequest: 1 } },
        );
        console.error(
          'No se pudo enviar la petición de información:',
          err instanceof Error ? err.message : err,
        );
        throw new ApiError(
          502,
          'mail_failed',
          'No se pudo enviar el correo; la solicitud sigue pendiente',
        );
      }
      await audit('ask_info', {
        status: { from: 'pending', to: 'info_requested' },
        deadline: deadline.toISOString(),
      });
    }

    const targets = await loadTargets([updated]);
    res
      .set('Cache-Control', 'no-store')
      .json(
        toModerationItem(
          updated,
          targets.get(String(updated.targetRestaurantId)),
        ),
      );
  });

  return router;
}
