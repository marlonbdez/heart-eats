import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { Restaurant } from '../src/models/restaurant.js';
import { Team } from '../src/models/team.js';
import { restaurantData } from './helpers/data.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';

const app = createApp({ CORS_ORIGINS: ['https://hearteats.org'] });
const get = (path: string) => request(app).get(`/api/v1${path}`);

const madrid = { slug: 'demo-madrid', name: '[DEMO] Masa Madre' };
const barcelona = {
  slug: 'demo-barcelona',
  name: '[DEMO] Cala',
  foodTags: ['sushi'],
  address: {
    street: 'Carrer 2',
    postalCode: '08001',
    city: 'Barcelona',
    country: 'ES',
  },
  location: { type: 'Point', coordinates: [2.1734, 41.3851] },
};
const lisbon = {
  slug: 'demo-lisboa',
  name: '[DEMO] Pastel',
  foodTags: ['desserts'],
  address: { street: 'Rua 3', city: 'Lisboa', country: 'PT' },
  location: { type: 'Point', coordinates: [-9.1393, 38.7223] },
};

const slugs = (body: { items: { slug: string }[] }) =>
  body.items.map((i) => i.slug);

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

async function seed3() {
  await Restaurant.create([
    restaurantData(madrid),
    restaurantData(barcelona),
    restaurantData(lisbon),
  ]);
}

describe('GET /restaurants', () => {
  it('sin zona, 400: nunca se piden todos', async () => {
    const res = await get('/restaurants');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('zone_required');
  });

  it('por ciudad, sin importar mayúsculas ni acentos', async () => {
    await seed3();
    const res = await get('/restaurants?city=MADRID');
    expect(res.status).toBe(200);
    expect(slugs(res.body)).toEqual(['demo-madrid']);
    expect(res.headers['cache-control']).toBe('public, max-age=60');
  });

  it('por país', async () => {
    await seed3();
    const res = await get('/restaurants?country=es');
    expect(slugs(res.body)).toEqual(['demo-barcelona', 'demo-madrid']);
  });

  it('solo lo publicado y con verificación pública', async () => {
    await Restaurant.create([
      restaurantData(madrid),
      restaurantData({ slug: 'demo-pendiente', status: 'pending' }),
      restaurantData({ slug: 'demo-archivado', status: 'archived' }),
      restaurantData({
        slug: 'demo-sin-verificar',
        verification: { level: 'unverified' },
      }),
      restaurantData({
        slug: 'demo-comunidad',
        verification: {
          level: 'community',
          method: 'owner_confirmed',
          lastVerifiedAt: new Date('2026-09-02T00:00:00Z'),
        },
      }),
    ]);
    const res = await get('/restaurants?city=madrid');
    expect(slugs(res.body)).toEqual(['demo-comunidad', 'demo-madrid']);
  });

  it('por bbox: incluye lo de dentro y deja fuera lo de fuera', async () => {
    await seed3();
    const res = await get('/restaurants?bbox=-3.9,40.3,-3.5,40.5');
    expect(slugs(res.body)).toEqual(['demo-madrid']);
  });

  it('bbox que cruza el antimeridiano', async () => {
    await Restaurant.create([
      restaurantData({
        slug: 'demo-este',
        location: { type: 'Point', coordinates: [179.9, -16.8] },
      }),
      restaurantData({
        slug: 'demo-oeste',
        location: { type: 'Point', coordinates: [-179.9, -16.8] },
      }),
      restaurantData(madrid),
    ]);
    const res = await get('/restaurants?bbox=179,-20,-179,-10');
    expect(slugs(res.body)).toEqual(['demo-este', 'demo-oeste']);
  });

  it('near ordena por distancia', async () => {
    await seed3();
    const res = await get('/restaurants?near=41.4,2.17&country=ES');
    expect(slugs(res.body)).toEqual(['demo-barcelona', 'demo-madrid']);
    const lisbonFirst = await get('/restaurants?near=38.7,-9.1&limit=3');
    expect(slugs(lisbonFirst.body)).toEqual([
      'demo-lisboa',
      'demo-madrid',
      'demo-barcelona',
    ]);
  });

  it('por comida (cualquiera de las pedidas)', async () => {
    await seed3();
    const res = await get('/restaurants?country=ES&food=sushi,tapas');
    expect(slugs(res.body)).toEqual(['demo-barcelona']);
  });

  it('el buscador ignora acentos y mayúsculas, y encuentra por código postal', async () => {
    await seed3();
    expect(
      slugs((await get('/restaurants?country=ES&q=LAVAPIES')).body),
    ).toEqual(['demo-madrid']);
    expect(slugs((await get('/restaurants?country=ES&q=08001')).body)).toEqual([
      'demo-barcelona',
    ]);
    expect(slugs((await get('/restaurants?country=ES&q=cala')).body)).toEqual([
      'demo-barcelona',
    ]);
  });

  it('una búsqueda con símbolos de expresión regular no rompe nada', async () => {
    await seed3();
    const res = await get('/restaurants?country=ES&q=.*(');
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it('pagina con cursor sin repetir ni saltarse locales', async () => {
    await seed3();
    const first = await get('/restaurants?bbox=-180,-90,180,90&limit=2');
    expect(slugs(first.body)).toEqual(['demo-barcelona', 'demo-lisboa']);
    expect(first.body.nextCursor).toEqual(expect.any(String));

    const second = await get(
      `/restaurants?bbox=-180,-90,180,90&limit=2&cursor=${first.body.nextCursor}`,
    );
    expect(slugs(second.body)).toEqual(['demo-madrid']);
    expect(second.body.nextCursor).toBeUndefined();
  });

  it('los parámetros inválidos dan 422', async () => {
    expect((await get('/restaurants?bbox=1,2,3')).status).toBe(422);
    expect((await get('/restaurants?city=x&cursor=basura')).status).toBe(422);
    expect((await get('/restaurants?bbox=-3,40,-2,41&near=40,-3')).status).toBe(
      400,
    );
  });

  it('la lista no incluye el equipo ni datos internos', async () => {
    const r = await Restaurant.create(restaurantData(madrid));
    await Team.create({
      restaurantId: r._id,
      visibilityLevel: 'minimal',
      summary: { totalStaff: 9, staffWithDisability: 3 },
    });
    const res = await get('/restaurants?city=madrid');
    const json = JSON.stringify(res.body);
    expect(res.body.items[0]).not.toHaveProperty('team');
    for (const internal of [
      '_id',
      'searchText',
      'cityKey',
      'isIndependent',
      'status',
    ]) {
      expect(json).not.toContain(internal);
    }
    expect(res.body.items[0].location).toEqual({ lat: 40.4085, lng: -3.7012 });
  });
});

describe('GET /restaurants/geojson', () => {
  it('devuelve un punto por local, con los mismos filtros', async () => {
    await seed3();
    const res = await get('/restaurants/geojson?country=ES');
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('FeatureCollection');
    expect(res.body.truncated).toBe(false);
    expect(res.body.features).toHaveLength(2);
    expect(res.body.features[0]).toEqual({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [2.1734, 41.3851] },
      properties: {
        slug: 'demo-barcelona',
        name: '[DEMO] Cala',
        foodTags: ['sushi'],
      },
    });
  });

  it('también exige una zona', async () => {
    expect((await get('/restaurants/geojson')).status).toBe(400);
  });
});

describe('GET /restaurants/:slug', () => {
  const confirmed = new Date('2026-09-01T00:00:00Z');

  async function withTeam(
    restaurantOver: Record<string, unknown>,
    teamOver: Record<string, unknown>,
  ) {
    const r = await Restaurant.create(
      restaurantData({
        ownerConfirmedAt: confirmed,
        ...madrid,
        ...restaurantOver,
      }),
    );
    await Team.create({
      restaurantId: r._id,
      visibilityLevel: 'full',
      summary: { totalStaff: 9, staffWithDisability: 3 },
      areas: ['kitchen'],
      disabilityTypes: ['hearing_impairment'],
      stories: [
        {
          displayName: 'Vigente',
          role: 'Cocina',
          storyText: 'Texto.',
          consentRecordedAt: confirmed,
          consentBy: 'self',
        },
        {
          displayName: 'Retirada',
          role: 'Sala',
          storyText: 'Texto retirado.',
          consentRecordedAt: confirmed,
          consentBy: 'self',
          revokedAt: new Date('2026-10-01'),
        },
      ],
      ...teamOver,
    });
  }

  it('la ficha trae el equipo completo con permiso y sin lo retirado', async () => {
    await withTeam({}, {});
    const res = await get('/restaurants/demo-madrid');
    expect(res.status).toBe(200);
    expect(res.body.team.level).toBe('full');
    expect(res.body.team.areas).toEqual(['kitchen']);
    expect(
      res.body.team.stories.map((s: { displayName: string }) => s.displayName),
    ).toEqual(['Vigente']);
    expect(JSON.stringify(res.body)).not.toContain('Retirada');
    expect(JSON.stringify(res.body)).not.toContain('consent');
  });

  it('sin el sí del negocio, solo las cifras', async () => {
    await withTeam({ ownerConfirmedAt: undefined }, {});
    const res = await get('/restaurants/demo-madrid');
    expect(res.body.team).toEqual({
      level: 'minimal',
      summary: { totalStaff: 9, staffWithDisability: 3 },
    });
    expect(JSON.stringify(res.body)).not.toContain('Vigente');
  });

  it('en un equipo pequeño, solo las cifras', async () => {
    await withTeam({}, { summary: { totalStaff: 4, staffWithDisability: 1 } });
    const res = await get('/restaurants/demo-madrid');
    expect(res.body.team.level).toBe('minimal');
    expect(res.body.team).not.toHaveProperty('stories');
    expect(res.body.team).not.toHaveProperty('areas');
  });

  it('un local sin equipo no lleva team', async () => {
    await Restaurant.create(restaurantData(madrid));
    const res = await get('/restaurants/demo-madrid');
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('team');
  });

  it('404 si no existe, no está publicado o el slug no es válido', async () => {
    await Restaurant.create([
      restaurantData(madrid),
      restaurantData({ slug: 'demo-pendiente', status: 'pending' }),
    ]);
    expect((await get('/restaurants/no-existe')).status).toBe(404);
    expect((await get('/restaurants/demo-pendiente')).status).toBe(404);
    expect((await get('/restaurants/$ne')).status).toBe(404);
    expect((await get('/restaurants/no-existe')).body.error.code).toBe(
      'not_found',
    );
  });
});

describe('GET /meta/filters', () => {
  it('sirve los catálogos', async () => {
    const res = await get('/meta/filters');
    expect(res.status).toBe(200);
    expect(res.body.foodTags[0]).toEqual({ key: 'pizza', icon: '🍕' });
    expect(res.body.businessTypes).toContain('social_project');
    expect(res.body.inclusionTypes).toContain('autism_spectrum');
  });
});
