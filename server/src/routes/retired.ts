import { Router } from 'express';
import { Types } from 'mongoose';
import { ApiError } from '../errors.js';
import { authOf, requireSession } from '../middleware/session.js';
import { AuditLog } from '../models/audit-log.js';
import { Restaurant, type RestaurantRecord } from '../models/restaurant.js';
import { Team, type TeamRecord } from '../models/team.js';
import {
  REVOKED_STORY_DAYS,
  RETIRED_LISTING_DAYS,
} from '../services/retention.js';
import { objectIdPattern } from '../services/suggestion-query.js';

const DAY = 24 * 60 * 60_000;

// Lo pendiente de borrar es poco y se borra solo: la lista cabe entera.
const MAX_ITEMS = 200;

type Place = Pick<RestaurantRecord, '_id' | 'slug' | 'name'> & {
  address: Pick<RestaurantRecord['address'], 'city'>;
};

const deleteAt = (retired: Date, days: number) =>
  new Date(retired.getTime() + days * DAY).toISOString();

const notFound = () =>
  new ApiError(404, 'not_found', 'Esa ficha ya no está pendiente de borrado');

export function retiredRouter({
  allowedOrigins,
}: {
  allowedOrigins: readonly string[];
}) {
  const router = Router();

  // Todo lo de aquí es de administración (ADR 0008).
  router.use(
    '/retired',
    ...requireSession(allowedOrigins),
    (_req, res, next) => {
      if (authOf(res).role !== 'admin') {
        throw new ApiError(
          403,
          'forbidden',
          'Lo retirado lo gestiona un administrador',
        );
      }
      res.set('Cache-Control', 'no-store');
      next();
    },
  );

  // Lo retirado que aún no se ha borrado, con el día en que se borrará. De las
  // historias solo salen el local, la posición y las fechas: nunca el nombre,
  // el puesto ni el texto (ni se leen de la base de datos).
  router.get('/retired', async (_req, res) => {
    const [listings, teams] = await Promise.all([
      Restaurant.find({ status: 'archived', retiredAt: { $exists: true } })
        .sort({ retiredAt: 1, _id: 1 })
        .limit(MAX_ITEMS)
        .select('slug name address.city retiredAt')
        .lean<(Place & { retiredAt: Date })[]>(),
      Team.find({
        stories: {
          $elemMatch: {
            revokedAt: { $exists: true },
            purgedAt: { $exists: false },
          },
        },
      })
        .limit(MAX_ITEMS)
        .select('restaurantId stories.revokedAt stories.purgedAt')
        .lean<Pick<TeamRecord, '_id' | 'restaurantId' | 'stories'>[]>(),
    ]);

    const places = new Map(
      (
        await Restaurant.find({
          _id: { $in: teams.map((t) => t.restaurantId) },
        })
          .select('slug name address.city')
          .lean<Place[]>()
      ).map((p) => [String(p._id), p]),
    );

    const stories = teams
      .flatMap((team) => {
        const place = places.get(String(team.restaurantId));
        if (!place) return [];
        return (team.stories ?? []).flatMap((s, index) =>
          s.revokedAt && !s.purgedAt
            ? [
                {
                  restaurantSlug: place.slug,
                  restaurantName: place.name,
                  index,
                  revokedAt: s.revokedAt.toISOString(),
                  deleteAt: deleteAt(s.revokedAt, REVOKED_STORY_DAYS),
                },
              ]
            : [],
        );
      })
      .sort((a, b) => a.deleteAt.localeCompare(b.deleteAt));

    res.json({
      listings: listings.map((l) => ({
        id: String(l._id),
        slug: l.slug,
        name: l.name,
        city: l.address.city,
        retiredAt: l.retiredAt.toISOString(),
        deleteAt: deleteAt(l.retiredAt, RETIRED_LISTING_DAYS),
      })),
      stories,
    });
  });

  // Devuelve una ficha retirada por error: vuelve a verse y deja de contar el
  // plazo. Solo fichas retiradas a petición del negocio (las que tienen
  // `retiredAt`) y mientras sigan ahí. Las historias retiradas no se
  // restauran: retirarlas es retirar el consentimiento.
  router.post('/retired/listings/:id/restore', async (req, res) => {
    const id = String(req.params.id);
    if (!objectIdPattern.test(id)) throw notFound();
    const done = await Restaurant.updateOne(
      { _id: id, status: 'archived', retiredAt: { $exists: true } },
      { $set: { status: 'published' }, $unset: { retiredAt: 1 } },
    );
    // También si el trabajo horario la borró justo antes.
    if (done.modifiedCount === 0) throw notFound();
    await AuditLog.create({
      entity: 'restaurant',
      entityId: new Types.ObjectId(id),
      action: 'restore',
      actorId: authOf(res).id,
      diff: { status: { from: 'archived', to: 'published' } },
    });
    res.status(204).end();
  });

  return router;
}
