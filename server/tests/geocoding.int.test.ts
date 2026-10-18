import { Types } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { Restaurant } from '../src/models/restaurant.js';
import { Suggestion } from '../src/models/suggestion.js';
import type { Geocoder, GeocodeQuery } from '../src/services/geocoder.js';
import { restaurantData } from './helpers/data.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { signedInCookie } from './helpers/session.js';

// Un local de restaurantData está en [-3.7012, 40.4085].
const PIN = { lat: 40.4085, lng: -3.7012, country: 'ES' };

let calls: GeocodeQuery[];
let behaviour: () => Promise<typeof PIN | null>;
const geocoder: Geocoder = {
  async geocode(query) {
    calls.push(query);
    return behaviour();
  },
  async cityNames() {
    return {};
  },
};
const app = createApp(
  { CORS_ORIGINS: ['https://hearteats.org'] },
  { geocoder },
);
const plainApp = createApp({ CORS_ORIGINS: ['https://hearteats.org'] });

const open = (id: unknown, cookie: string, target = app) =>
  request(target)
    .get(`/api/v1/suggestions/${String(id)}`)
    .set('Cookie', cookie);

const proposal = (over: Record<string, unknown> = {}) =>
  Suggestion.create({
    type: 'new',
    payload: {
      name: 'Casa Nueva',
      street: 'Calle Mayor 5',
      postalCode: '28013',
      city: 'Madrid',
      foodTags: ['tapas'],
      dishes: [],
    },
    cityKey: 'madrid',
    evidence: ['https://example.org/a'],
    ...over,
  });

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  calls = [];
  behaviour = async () => PIN;
  await clearTestDb();
});

describe('GET /api/v1/suggestions/:id geocodifica un local nuevo', () => {
  it('la primera apertura guarda el pin y lo devuelve', async () => {
    const s = await proposal();
    const cookie = await signedInCookie();
    const res = await open(s._id, cookie);

    expect(res.status).toBe(200);
    expect(res.body.location).toEqual({ lat: PIN.lat, lng: PIN.lng });
    expect(calls).toEqual([
      { street: 'Calle Mayor 5', postalCode: '28013', city: 'Madrid' },
    ]);
    const doc = await Suggestion.findById(s._id).lean();
    expect(doc?.geocode).toMatchObject({ ...PIN, provider: 'nominatim' });
  });

  it('no se vuelve a pedir en la segunda apertura', async () => {
    const s = await proposal();
    const cookie = await signedInCookie();
    await open(s._id, cookie);
    const again = await open(s._id, cookie);
    expect(calls).toHaveLength(1);
    expect(again.body.location).toEqual({ lat: PIN.lat, lng: PIN.lng });
  });

  it('si no encuentra la dirección, lo anota y no hay pin ni nueva consulta', async () => {
    behaviour = async () => null;
    const s = await proposal();
    const cookie = await signedInCookie();
    const res = await open(s._id, cookie);
    expect(res.status).toBe(200);
    expect(res.body.location).toBeUndefined();
    await open(s._id, cookie);
    expect(calls).toHaveLength(1);
  });

  it('si el servicio falla, se ve sin pin y se reintenta la próxima vez', async () => {
    behaviour = async () => {
      throw new Error('Nominatim respondió 503');
    };
    const s = await proposal();
    const cookie = await signedInCookie();
    const res = await open(s._id, cookie);
    expect(res.status).toBe(200);
    expect(res.body.location).toBeUndefined();
    expect((await Suggestion.findById(s._id).lean())?.geocode).toBeUndefined();

    behaviour = async () => PIN;
    expect((await open(s._id, cookie)).body.location).toBeDefined();
    expect(calls).toHaveLength(2);
  });

  it('sin calle no se geocodifica', async () => {
    const s = await proposal({
      payload: {
        name: 'Sin calle',
        city: 'Madrid',
        foodTags: ['tapas'],
        dishes: [],
      },
    });
    const res = await open(s._id, await signedInCookie());
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(0);
  });

  it('sin geocodificador configurado no hace nada', async () => {
    const s = await proposal();
    const res = await open(s._id, await signedInCookie(), plainApp);
    expect(res.status).toBe(200);
    expect(res.body.location).toBeUndefined();
  });

  it('no geocodifica correcciones, retiradas ni solicitudes ya resueltas', async () => {
    const place = await Restaurant.create(restaurantData());
    const cookie = await signedInCookie();
    const edit = await proposal({
      type: 'edit',
      targetRestaurantId: place._id,
      payload: { kind: 'address', details: 'Calle Nueva 1' },
    });
    const closed = await proposal({ status: 'rejected' });
    await open(edit._id, cookie);
    await open(closed._id, cookie);
    expect(calls).toHaveLength(0);
  });

  it('la lista de la cola no geocodifica', async () => {
    await proposal();
    await request(app)
      .get('/api/v1/suggestions')
      .set('Cookie', await signedInCookie());
    expect(calls).toHaveLength(0);
  });

  it('fuera del ámbito, 404 y sin consultar al servicio', async () => {
    const s = await proposal({
      payload: {
        name: 'París',
        street: 'Rue 1',
        city: 'Paris',
        foodTags: [],
        dishes: [],
      },
      cityKey: 'paris',
    });
    const cookie = await signedInCookie();
    expect((await open(s._id, cookie)).status).toBe(404);
    expect((await open(new Types.ObjectId(), cookie)).status).toBe(404);
    expect(calls).toHaveLength(0);
  });
});

describe('aviso de duplicado por distancia', () => {
  it('un local a menos de 50 m da un aviso con los metros', async () => {
    await Restaurant.create(
      restaurantData({ slug: 'cerca', name: 'Bar Cercano' }),
    );
    const s = await proposal();
    const res = await open(s._id, await signedInCookie());
    expect(res.body.warnings).toContainEqual({
      kind: 'duplicate',
      other: 'Bar Cercano',
      meters: 0,
    });
  });

  it('si ya había un aviso por nombre, solo se le añade la distancia', async () => {
    await Restaurant.create(
      restaurantData({ slug: 'cerca', name: 'Casa Nueva' }),
    );
    const s = await proposal({
      warnings: [{ kind: 'duplicate', other: 'Casa Nueva' }],
    });
    const res = await open(s._id, await signedInCookie());
    expect(res.body.warnings).toEqual([
      { kind: 'duplicate', other: 'Casa Nueva', meters: 0 },
    ]);
  });

  it('un local a más de 50 m no avisa', async () => {
    await Restaurant.create(
      restaurantData({
        slug: 'lejos',
        name: 'Bar Lejano',
        location: { type: 'Point', coordinates: [-3.7012, 40.4095] }, // ~110 m
      }),
    );
    const s = await proposal();
    const res = await open(s._id, await signedInCookie());
    expect(res.body.warnings).toEqual([]);
  });

  it('no cuenta lo no publicado ni lo archivado', async () => {
    await Restaurant.create(
      restaurantData({ slug: 'viejo', name: 'Cerrado', status: 'archived' }),
    );
    const s = await proposal();
    const res = await open(s._id, await signedInCookie());
    expect(res.body.warnings).toEqual([]);
  });
});
