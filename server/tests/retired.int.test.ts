import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { AuditLog } from '../src/models/audit-log.js';
import { Restaurant } from '../src/models/restaurant.js';
import { Team } from '../src/models/team.js';
import {
  RETIRED_LISTING_DAYS,
  REVOKED_STORY_DAYS,
} from '../src/services/retention.js';
import { restaurantData } from './helpers/data.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { signedInCookie } from './helpers/session.js';

const ORIGIN = 'https://hearteats.org';
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

const app = createApp({ CORS_ORIGINS: [ORIGIN] });
const list = (cookie?: string) => {
  const req = request(app).get('/api/v1/retired');
  return cookie ? req.set('Cookie', cookie) : req;
};
const restore = (id: string, cookie?: string) => {
  const req = request(app)
    .post(`/api/v1/retired/listings/${id}/restore`)
    .set('Origin', ORIGIN)
    .set('X-Requested-With', 'heart-eats');
  return cookie ? req.set('Cookie', cookie) : req;
};
const admin = () => signedInCookie({ role: 'admin' });

const retiredPlace = (slug: string, retiredAt = daysAgo(3)) =>
  Restaurant.create(
    restaurantData({
      slug,
      name: `[DEMO] ${slug}`,
      status: 'archived',
      retiredAt,
    }),
  );

const story = (name: string, over: Record<string, unknown> = {}) => ({
  displayName: name,
  role: 'Cocina',
  storyText: `Historia de ${name}`,
  consentRecordedAt: daysAgo(100),
  consentBy: 'self',
  ...over,
});

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

describe('acceso', () => {
  it('sin sesión, 401', async () => {
    expect((await list()).status).toBe(401);
    expect((await restore('0'.repeat(24))).status).toBe(401);
  });

  it('un moderador, 403 en ambas', async () => {
    const cookie = await signedInCookie();
    expect((await list(cookie)).status).toBe(403);
    expect((await restore('0'.repeat(24), cookie)).status).toBe(403);
  });
});

describe('GET /api/v1/retired', () => {
  it('sin nada retirado, listas vacías y sin caché', async () => {
    const res = await list(await admin());
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toEqual({ listings: [], stories: [] });
  });

  it('lista las fichas retiradas con el día de borrado, las más próximas primero', async () => {
    const recent = await retiredPlace('reciente', daysAgo(1));
    const old = await retiredPlace('antigua', daysAgo(15));
    // Archivada por cierre (sin retiredAt) y publicada: no cuentan.
    await Restaurant.create(
      restaurantData({ slug: 'cerrada', status: 'archived' }),
    );
    await Restaurant.create(restaurantData({ slug: 'abierta' }));

    const { listings } = (await list(await admin())).body;
    expect(listings.map((l: { slug: string }) => l.slug)).toEqual([
      'antigua',
      'reciente',
    ]);
    expect(listings[0]).toEqual({
      id: String(old._id),
      slug: 'antigua',
      name: '[DEMO] antigua',
      city: 'Madrid',
      retiredAt: old.retiredAt!.toISOString(),
      deleteAt: new Date(
        old.retiredAt!.getTime() + RETIRED_LISTING_DAYS * DAY,
      ).toISOString(),
    });
    expect(listings[1].id).toBe(String(recent._id));
  });

  it('lista las historias retiradas por posición, sin su contenido', async () => {
    const place = await Restaurant.create(restaurantData());
    const revokedAt = daysAgo(5);
    await Team.create({
      restaurantId: place._id,
      visibilityLevel: 'full',
      summary: { totalStaff: 10, staffWithDisability: 4 },
      stories: [
        story('Ana'),
        story('Luis', { revokedAt }),
        story('Marta', { revokedAt: daysAgo(40), purgedAt: daysAgo(10) }),
      ],
    });

    const res = await list(await admin());
    expect(res.body.stories).toEqual([
      {
        restaurantSlug: 'demo-uno',
        restaurantName: '[DEMO] Uno',
        index: 1,
        revokedAt: revokedAt.toISOString(),
        deleteAt: new Date(
          revokedAt.getTime() + REVOKED_STORY_DAYS * DAY,
        ).toISOString(),
      },
    ]);
    expect(JSON.stringify(res.body)).not.toMatch(
      /Ana|Luis|Marta|Cocina|Historia/,
    );
  });
});

describe('POST /api/v1/retired/listings/:id/restore', () => {
  it('devuelve la ficha: vuelve a publicada, sin fecha de retirada, y queda en el registro', async () => {
    const place = await retiredPlace('retirada');
    const cookie = await admin();
    const res = await restore(String(place._id), cookie);
    expect(res.status).toBe(204);

    const after = await Restaurant.findById(place._id).lean();
    expect(after?.status).toBe('published');
    expect(after?.retiredAt).toBeUndefined();

    const entry = await AuditLog.findOne({ action: 'restore' }).lean();
    expect(entry?.entity).toBe('restaurant');
    expect(String(entry?.entityId)).toBe(String(place._id));
    expect(entry?.actorId).toBeDefined();
    expect(entry?.diff).toEqual({
      status: { from: 'archived', to: 'published' },
    });
    expect((await list(cookie)).body.listings).toEqual([]);
  });

  it('no restaura una ficha archivada por cierre ni una publicada', async () => {
    const closed = await Restaurant.create(
      restaurantData({ slug: 'cerrada', status: 'archived' }),
    );
    const open = await Restaurant.create(restaurantData({ slug: 'abierta' }));
    const cookie = await admin();

    expect((await restore(String(closed._id), cookie)).status).toBe(404);
    expect((await restore(String(open._id), cookie)).status).toBe(404);
    expect((await Restaurant.findById(closed._id))?.status).toBe('archived');
    expect(await AuditLog.countDocuments({ action: 'restore' })).toBe(0);
  });

  it('una ficha que ya no existe o un id raro, 404', async () => {
    const cookie = await admin();
    expect((await restore('0'.repeat(24), cookie)).status).toBe(404);
    expect((await restore('no-es-un-id', cookie)).status).toBe(404);
  });

  it('dos veces seguidas: la segunda, 404 y un solo registro', async () => {
    const place = await retiredPlace('retirada');
    const cookie = await admin();
    expect((await restore(String(place._id), cookie)).status).toBe(204);
    expect((await restore(String(place._id), cookie)).status).toBe(404);
    expect(await AuditLog.countDocuments({ action: 'restore' })).toBe(1);
  });
});
