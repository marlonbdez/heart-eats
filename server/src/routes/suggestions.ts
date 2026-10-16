import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { Types } from 'mongoose';
import { ApiError } from '../errors.js';
import { authOf, requireSession } from '../middleware/session.js';
import { AuditLog } from '../models/audit-log.js';
import { Restaurant } from '../models/restaurant.js';
import { Suggestion, type SuggestionRecord } from '../models/suggestion.js';
import type { ModerationScope } from '../models/user.js';
import {
  decisionSchema,
  newPlaceApprovalSchema,
} from '../services/decision-input.js';
import type { Geocoder } from '../services/geocoder.js';
import type { Mailer } from '../services/mailer.js';
import {
  toModerationItem,
  type TargetRestaurant,
} from '../services/moderation-item.js';
import {
  IncompleteProposalError,
  publishProposal,
} from '../services/publish-proposal.js';
import { REPLY_DAYS, signReplyToken } from '../services/reply-token.js';
import {
  encodeQueueCursor,
  objectIdPattern,
  parseQueueQuery,
  restaurantScopeFilter,
  scopeFilter,
  statusesOf,
} from '../services/suggestion-query.js';
import { ensureGeocode } from '../services/suggestion-geocode.js';
import { parseOrThrow } from '../validation.js';

interface SuggestionsOptions {
  allowedOrigins: readonly string[];
  mailer: Mailer;
  // Base de los enlaces del correo (la web, no la API).
  webUrl: string;
  replyTokenSecret: string;
  geocoder?: Geocoder;
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

// País de la ficha cuando el geocodificador no lo da (pin puesto a mano): el
// del ámbito de quien aprueba, si es uno solo.
function scopeCountry(scope: readonly ModerationScope[]) {
  const countries = new Set(scope.map((entry) => entry.country));
  return countries.size === 1 ? [...countries][0] : undefined;
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
  geocoder,
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
    const found = await findVisible(
      String(req.params.id),
      authOf(res).moderationScope,
    );
    // La primera apertura de un local nuevo geocodifica su dirección.
    const record = await ensureGeocode(found, geocoder);
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

  // Aprobar un local nuevo: publica su ficha y cierra la solicitud. Primero se
  // crea la ficha y después se cierra la solicitud: si crearla falla, la
  // solicitud no cambia; si otra persona se adelantó, se deshace la ficha.
  async function approveNewPlace(
    found: SuggestionRecord,
    user: ReturnType<typeof authOf>,
    body: unknown,
    now: Date,
  ) {
    const approval = parseOrThrow(newPlaceApprovalSchema, body);
    // Si no se abrió antes, se geocodifica ahora (salvo pin a mano).
    const record = approval.location
      ? found
      : await ensureGeocode(found, geocoder);

    const { lat, lng } = approval.location ?? record.geocode ?? {};
    if (lat === undefined || lng === undefined) {
      throw new ApiError(
        422,
        'geocoding_required',
        'No hay pin: la dirección no se pudo geocodificar; colócalo a mano (location)',
      );
    }
    const country =
      record.geocode?.country ?? scopeCountry(user.moderationScope);
    if (!country) {
      throw new ApiError(
        422,
        'country_required',
        'No se sabe el país del local; el geocodificador no lo dio',
      );
    }

    let restaurant;
    try {
      restaurant = await publishProposal({
        payload: record.payload,
        approval,
        pin: { lat, lng },
        country,
        now,
      });
    } catch (err) {
      if (err instanceof IncompleteProposalError) {
        throw new ApiError(
          422,
          'proposal_incomplete',
          `A la propuesta le falta ${err.field === 'street' ? 'la calle' : 'una categoría de comida'}: pídela a quien propuso`,
        );
      }
      throw err;
    }

    // El correo se borra al resolver (docs/08) y el enlace de respuesta, si lo
    // había, deja de valer.
    let updated: SuggestionRecord | null;
    try {
      updated = await Suggestion.findOneAndUpdate(
        { _id: record._id, status: { $in: ['pending', 'info_requested'] } },
        {
          $set: {
            status: 'approved',
            resolution: {
              restaurantId: restaurant._id,
              decidedBy: user.id,
              decidedAt: now,
            },
          },
          $unset: { contactEmail: 1, 'infoRequest.nonce': 1 },
        },
        { returnDocument: 'after' },
      ).lean<SuggestionRecord>();
    } catch (err) {
      await Restaurant.deleteOne({ _id: restaurant._id });
      throw err;
    }
    if (!updated) {
      await Restaurant.deleteOne({ _id: restaurant._id });
      throw changed();
    }

    const actorId = new Types.ObjectId(user.id);
    await AuditLog.create([
      {
        entity: 'suggestion',
        entityId: record._id,
        action: 'approve',
        actorId,
        diff: {
          status: { from: record.status, to: 'approved' },
          restaurantId: String(restaurant._id),
        },
      },
      {
        entity: 'restaurant',
        entityId: restaurant._id,
        action: 'create',
        actorId,
        diff: {
          status: { to: 'published' },
          level: approval.level,
          method: approval.method,
          suggestionId: String(record._id),
        },
      },
    ]);

    // Aviso a quien propuso, si dejó correo. La ficha ya está publicada: si el
    // correo falla solo se anota, sin la dirección.
    if (record.contactEmail) {
      try {
        await mailer.sendApproval({
          to: record.contactEmail,
          url: `${webUrl}/${record.locale}/place/${restaurant.slug}`,
          name: restaurant.name,
          locale: record.locale,
        });
      } catch (err) {
        console.error(
          'No se pudo enviar el aviso de ficha publicada:',
          err instanceof Error ? err.message : err,
        );
      }
    }
    return updated;
  }

  // Aprobar, rechazar o pedir información.
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
    if (record.status === 'approved' || record.status === 'rejected') {
      throw new ApiError(
        409,
        'already_resolved',
        'La solicitud ya está resuelta',
      );
    }
    if (decision.action === 'approve' && record.type !== 'new') {
      throw new ApiError(
        501,
        'not_implemented',
        'Por ahora solo se puede aprobar un local nuevo',
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
    if (decision.action === 'approve') {
      updated = await approveNewPlace(record, user, req.body, now);
    } else if (decision.action === 'reject') {
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
