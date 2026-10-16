import { Router } from 'express';
import { Types } from 'mongoose';
import { ApiError } from '../errors.js';
import { authOf, requireSession } from '../middleware/session.js';
import { Restaurant } from '../models/restaurant.js';
import { Suggestion, type SuggestionRecord } from '../models/suggestion.js';
import type { ModerationScope } from '../models/user.js';
import type { Geocoder } from '../services/geocoder.js';
import {
  toModerationItem,
  type TargetRestaurant,
} from '../services/moderation-item.js';
import {
  encodeQueueCursor,
  objectIdPattern,
  parseQueueQuery,
  restaurantScopeFilter,
  scopeFilter,
  statusesOf,
} from '../services/suggestion-query.js';
import { ensureGeocode } from '../services/suggestion-geocode.js';

interface SuggestionsOptions {
  allowedOrigins: readonly string[];
  geocoder?: Geocoder;
}

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

export function suggestionsRouter({
  allowedOrigins,
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

  // Una solicitud. Fuera del ámbito se responde igual que si no existiera.
  router.get('/suggestions/:id', ...auth, async (req, res) => {
    const id = String(req.params.id);
    const found = objectIdPattern.test(id)
      ? await Suggestion.findOne({
          $and: [{ _id: id }, await inScope(authOf(res).moderationScope)],
        }).lean<SuggestionRecord>()
      : null;
    if (!found) {
      throw new ApiError(404, 'not_found', 'Solicitud no encontrada');
    }
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

  return router;
}
