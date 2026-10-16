import { Types } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { Restaurant } from '../src/models/restaurant.js';
import { Suggestion } from '../src/models/suggestion.js';
import { restaurantData } from './helpers/data.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { signedInCookie } from './helpers/session.js';

const app = createApp({ CORS_ORIGINS: ['https://hearteats.org'] });
const get = (path: string, cookie?: string) => {
  const req = request(app).get(`/api/v1${path}`);
  return cookie ? req.set('Cookie', cookie) : req;
};

// Las pruebas fijan `createdAt` a mano: se guarda tal cual.
const seed = (docs: Record<string, unknown> | Record<string, unknown>[]) =>
  Suggestion.create(
    (Array.isArray(docs) ? docs : [docs]) as never[],
  ) as unknown as Promise<{ _id: Types.ObjectId }[]>;

const proposal = (name: string, city: string, createdAt: string) => ({
  type: 'new',
  payload: {
    name,
    street: 'Calle Mayor 5',
    city,
    foodTags: ['tapas'],
    dishes: [{ name: 'Tortilla' }],
  },
  cityKey: city.toLowerCase(),
  contactEmail: 'ana@example.org',
  evidence: ['https://example.org/a'],
  createdAt: new Date(createdAt),
});

let madridId: Types.ObjectId;
let parisId: Types.ObjectId;

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  await clearTestDb();
  madridId = (await Restaurant.create(restaurantData()))._id;
  parisId = (
    await Restaurant.create(
      restaurantData({
        slug: 'demo-paris',
        name: '[DEMO] París',
        address: { street: 'Rue 1', city: 'Paris', country: 'FR' },
      }),
    )
  )._id;
});

describe('autenticación', () => {
  it('sin sesión, 401 en la cola y en el detalle', async () => {
    expect((await get('/suggestions')).status).toBe(401);
    expect((await get(`/suggestions/${new Types.ObjectId()}`)).status).toBe(
      401,
    );
  });

  it('la respuesta no se guarda en caché', async () => {
    const cookie = await signedInCookie();
    const res = await get('/suggestions', cookie);
    expect(res.headers['cache-control']).toBe('no-store');
  });
});

describe('GET /api/v1/suggestions', () => {
  it('lista las pendientes de la más antigua a la más reciente, con el correo enmascarado', async () => {
    await seed([
      proposal('Nueva', 'Madrid', '2026-10-03T00:00:00Z'),
      proposal('Vieja', 'Madrid', '2026-10-01T00:00:00Z'),
      {
        ...proposal('Cerrada', 'Madrid', '2026-10-02T00:00:00Z'),
        status: 'rejected',
      },
    ]);
    const cookie = await signedInCookie();
    const res = await get('/suggestions', cookie);
    expect(res.status).toBe(200);
    expect(res.body.items.map((i: { name: string }) => i.name)).toEqual([
      'Vieja',
      'Nueva',
    ]);
    expect(res.body.items[0]).toMatchObject({
      type: 'new',
      status: 'pending',
      contactMasked: 'a***@example.org',
    });
    expect(res.body).not.toHaveProperty('nextCursor');
    expect(JSON.stringify(res.body)).not.toContain('ana@example.org');
  });

  it('filtra por estado (resolved: lo reciente primero) y por tipo', async () => {
    await seed([
      {
        ...proposal('A', 'Madrid', '2026-10-01T00:00:00Z'),
        status: 'approved',
      },
      {
        ...proposal('B', 'Madrid', '2026-10-02T00:00:00Z'),
        status: 'rejected',
      },
      {
        type: 'removal',
        status: 'pending',
        targetRestaurantId: madridId,
        payload: { what: 'story' },
        contactEmail: 'ana@example.org',
        createdAt: new Date('2026-10-04T00:00:00Z'),
      },
    ]);
    const cookie = await signedInCookie();
    const resolved = await get('/suggestions?status=resolved', cookie);
    expect(resolved.body.items.map((i: { name: string }) => i.name)).toEqual([
      'B',
      'A',
    ]);
    const removals = await get('/suggestions?type=removal', cookie);
    expect(removals.body.items).toHaveLength(1);
    expect(removals.body.items[0]).toMatchObject({
      type: 'removal',
      name: '[DEMO] Uno',
      restaurantSlug: 'demo-uno',
      removal: { what: 'story' },
    });
  });

  it('pagina con cursor sin repetir ni saltarse ninguna', async () => {
    await seed(
      [1, 2, 3, 4, 5].map((n) =>
        proposal(`P${n}`, 'Madrid', `2026-10-0${n}T00:00:00Z`),
      ),
    );
    const cookie = await signedInCookie();
    const names: string[] = [];
    let url = '/suggestions?limit=2';
    for (let i = 0; i < 5; i++) {
      const res = await get(url, cookie);
      names.push(...res.body.items.map((x: { name: string }) => x.name));
      if (!res.body.nextCursor) break;
      url = `/suggestions?limit=2&cursor=${res.body.nextCursor}`;
    }
    expect(names).toEqual(['P1', 'P2', 'P3', 'P4', 'P5']);
  });

  it('con la misma fecha, el cursor desempata por id', async () => {
    await seed(
      ['A', 'B', 'C'].map((n) => proposal(n, 'Madrid', '2026-10-01T00:00:00Z')),
    );
    const cookie = await signedInCookie();
    const first = await get('/suggestions?limit=2', cookie);
    const second = await get(
      `/suggestions?limit=2&cursor=${first.body.nextCursor}`,
      cookie,
    );
    const all = [...first.body.items, ...second.body.items].map(
      (i: { id: string }) => i.id,
    );
    expect(new Set(all).size).toBe(3);
  });

  it('solo ve lo de su ámbito', async () => {
    await seed([
      proposal('En Madrid', 'Madrid', '2026-10-01T00:00:00Z'),
      proposal('En París', 'Paris', '2026-10-02T00:00:00Z'),
      {
        type: 'edit',
        targetRestaurantId: madridId,
        payload: { kind: 'hours', details: 'x' },
        createdAt: new Date('2026-10-03T00:00:00Z'),
      },
      {
        type: 'edit',
        targetRestaurantId: parisId,
        payload: { kind: 'hours', details: 'x' },
        createdAt: new Date('2026-10-04T00:00:00Z'),
      },
    ]);
    const cookie = await signedInCookie();
    const res = await get('/suggestions', cookie);
    expect(res.body.items.map((i: { name: string }) => i.name)).toEqual([
      'En Madrid',
      '[DEMO] Uno',
    ]);
  });

  it('un ámbito vacío no ve nada', async () => {
    await seed(proposal('A', 'Madrid', '2026-10-01T00:00:00Z'));
    const cookie = await signedInCookie({ moderationScope: [] });
    const res = await get('/suggestions', cookie);
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it('rechaza con 422 parámetros no válidos', async () => {
    const cookie = await signedInCookie();
    expect((await get('/suggestions?status=zzz', cookie)).status).toBe(422);
    expect((await get('/suggestions?cursor=zzz', cookie)).status).toBe(422);
  });
});

describe('GET /api/v1/suggestions/:id', () => {
  it('devuelve la solicitud', async () => {
    const [s] = await seed(
      proposal('Casa Lola', 'Madrid', '2026-10-01T00:00:00Z'),
    );
    const cookie = await signedInCookie();
    const res = await get(`/suggestions/${s!._id}`, cookie);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: String(s!._id),
      name: 'Casa Lola',
      contactMasked: 'a***@example.org',
    });
  });

  it('404 si no existe, el id no es válido o está fuera del ámbito', async () => {
    const [outside] = await seed(
      proposal('En París', 'Paris', '2026-10-01T00:00:00Z'),
    );
    const cookie = await signedInCookie();
    for (const id of [
      new Types.ObjectId().toString(),
      'no-es-id',
      outside!._id,
    ]) {
      const res = await get(`/suggestions/${id}`, cookie);
      expect(res.status, String(id)).toBe(404);
    }
  });
});
