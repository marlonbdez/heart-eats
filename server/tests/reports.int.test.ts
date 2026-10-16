import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { Restaurant } from '../src/models/restaurant.js';
import { Suggestion } from '../src/models/suggestion.js';
import { Team } from '../src/models/team.js';
import { restaurantData } from './helpers/data.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';

const config = { CORS_ORIGINS: ['https://hearteats.org'] };
// Cada prueba arranca su propia app: el tope de envíos es por instancia.
let app: ReturnType<typeof createApp>;
const post = (path: string, body: unknown, target = app) =>
  request(target)
    .post(`/api/v1${path}`)
    .send(body as object);

const correction = {
  restaurantSlug: 'demo-uno',
  kind: 'address',
  details: 'Ahora está en la calle Mayor 7',
  evidenceUrl: 'https://example.org/nueva-direccion',
  contactEmail: 'Ana@Example.org',
  locale: 'en',
  website: '',
};
const removal = {
  restaurantSlug: 'demo-uno',
  what: 'story',
  details: 'Quiero que se retire mi historia',
  contactEmail: 'Ana@Example.org',
  locale: 'es',
  website: '',
};

const team = {
  restaurantSlug: 'demo-uno',
  level: 'full',
  summary: { totalStaff: 8, staffWithDisability: 3 },
  areas: ['kitchen', 'dining'],
  disabilityTypes: ['hearing_impairment'],
  stories: [
    {
      displayName: 'Lucía',
      role: 'Cocina',
      storyText: 'Llevo dos años en el equipo',
      consentBy: 'self',
    },
  ],
  contactEmail: 'Ana@Example.org',
  locale: 'en',
  website: '',
};

let restaurantId: string;

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  app = createApp(config);
  await clearTestDb();
  restaurantId = (await Restaurant.create(restaurantData())).id;
});

describe('POST /api/v1/corrections', () => {
  it('crea una solicitud de edición pendiente sobre el local', async () => {
    const res = await post('/corrections', correction);
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ id: expect.any(String), status: 'pending' });

    const saved = await Suggestion.findById(res.body.id).lean();
    expect(saved).toMatchObject({
      type: 'edit',
      status: 'pending',
      contactEmail: 'ana@example.org',
      locale: 'en',
      evidence: ['https://example.org/nueva-direccion'],
      payload: { kind: 'address', details: 'Ahora está en la calle Mayor 7' },
    });
    expect(String(saved?.targetRestaurantId)).toBe(restaurantId);
    expect(saved?.payload).not.toHaveProperty('contactEmail');
    expect(saved?.payload).not.toHaveProperty('website');
  });

  it('no cambia la ficha', async () => {
    await post('/corrections', correction);
    const record = await Restaurant.findById(restaurantId).lean();
    expect(record?.address?.street).toBe('Calle 1');
  });

  it('funciona sin correo ni enlace', async () => {
    const res = await post('/corrections', {
      restaurantSlug: 'demo-uno',
      kind: 'closed',
      details: 'Ha cerrado',
    });
    expect(res.status).toBe(202);
    const saved = await Suggestion.findById(res.body.id).lean();
    expect(saved?.contactEmail).toBeUndefined();
    expect(saved?.evidence).toEqual([]);
  });

  it('da 404 si el local no existe', async () => {
    const res = await post('/corrections', {
      ...correction,
      restaurantSlug: 'no-existe',
    });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
    expect(await Suggestion.countDocuments()).toBe(0);
  });

  it('da 404 si el local aún no está publicado', async () => {
    await Restaurant.create(
      restaurantData({ slug: 'pendiente', status: 'pending' }),
    );
    const res = await post('/corrections', {
      ...correction,
      restaurantSlug: 'pendiente',
    });
    expect(res.status).toBe(404);
  });

  it('da 422 si falta la explicación', async () => {
    const res = await post('/corrections', { ...correction, details: '' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('validation_failed');
    expect(await Suggestion.countDocuments()).toBe(0);
  });

  it('con el honeypot relleno responde 202 y no guarda nada', async () => {
    const res = await post('/corrections', { ...correction, website: 'x' });
    expect(res.status).toBe(202);
    expect(await Suggestion.countDocuments()).toBe(0);
  });
});

describe('POST /api/v1/teams', () => {
  it('crea una solicitud de equipo pendiente sobre el local', async () => {
    const res = await post('/teams', team);
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ id: expect.any(String), status: 'pending' });

    const saved = await Suggestion.findById(res.body.id).lean();
    expect(saved).toMatchObject({
      type: 'team',
      status: 'pending',
      contactEmail: 'ana@example.org',
      locale: 'en',
      payload: {
        level: 'full',
        summary: { totalStaff: 8, staffWithDisability: 3 },
        areas: ['kitchen', 'dining'],
        disabilityTypes: ['hearing_impairment'],
        stories: [
          {
            displayName: 'Lucía',
            role: 'Cocina',
            storyText: 'Llevo dos años en el equipo',
            consentBy: 'self',
          },
        ],
      },
    });
    expect(String(saved?.targetRestaurantId)).toBe(restaurantId);
    expect(saved?.payload).not.toHaveProperty('contactEmail');
    expect(saved?.payload).not.toHaveProperty('website');
  });

  it('no cambia la ficha por sí sola', async () => {
    await post('/teams', team);
    expect(await Team.countDocuments()).toBe(0);
  });

  it('guarda solo lo que cada nivel publica', async () => {
    const medium = await post('/teams', { ...team, level: 'medium' });
    const minimal = await post('/teams', { ...team, level: 'minimal' });
    const payload = async (id: string) =>
      (await Suggestion.findById(id).lean())?.payload;
    expect(await payload(medium.body.id)).toMatchObject({
      areas: ['kitchen', 'dining'],
    });
    expect(await payload(medium.body.id)).not.toHaveProperty('stories');
    expect(await payload(minimal.body.id)).not.toHaveProperty('areas');
    expect(await payload(minimal.body.id)).not.toHaveProperty('stories');
  });

  it('rechaza una historia sin el permiso de quien la cuenta', async () => {
    const [story] = team.stories;
    const { consentBy, ...sinPermiso } = story!;
    void consentBy;
    const res = await post('/teams', { ...team, stories: [sinPermiso] });
    expect(res.status).toBe(422);
    expect(
      res.body.error.details.map((d: { path: string }) => d.path),
    ).toContain('stories.0.consentBy');
    expect(await Suggestion.countDocuments()).toBe(0);
  });

  it('rechaza más de tres historias, cifras incoherentes y la falta de correo', async () => {
    const [story] = team.stories;
    const four = await post('/teams', {
      ...team,
      stories: [story, story, story, story],
    });
    const figures = await post('/teams', {
      ...team,
      summary: { totalStaff: 2, staffWithDisability: 5 },
    });
    const { contactEmail, ...sinCorreo } = team;
    void contactEmail;
    const noMail = await post('/teams', sinCorreo);
    expect([four.status, figures.status, noMail.status]).toEqual([
      422, 422, 422,
    ]);
    expect(await Suggestion.countDocuments()).toBe(0);
  });

  it('da 404 si el local no existe', async () => {
    const res = await post('/teams', { ...team, restaurantSlug: 'no-existe' });
    expect(res.status).toBe(404);
  });

  it('con el honeypot relleno responde 202 y no guarda nada', async () => {
    const res = await post('/teams', { ...team, website: 'x' });
    expect(res.status).toBe(202);
    expect(await Suggestion.countDocuments()).toBe(0);
  });
});

describe('POST /api/v1/removals', () => {
  it('crea una solicitud de retirada pendiente sobre el local', async () => {
    const res = await post('/removals', removal);
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ id: expect.any(String), status: 'pending' });

    const saved = await Suggestion.findById(res.body.id).lean();
    expect(saved).toMatchObject({
      type: 'removal',
      status: 'pending',
      contactEmail: 'ana@example.org',
      locale: 'es',
      payload: { what: 'story', details: 'Quiero que se retire mi historia' },
    });
    expect(String(saved?.targetRestaurantId)).toBe(restaurantId);
  });

  it('no oculta nada por sí sola: lo decide Moderación', async () => {
    await post('/removals', { ...removal, what: 'listing' });
    const record = await Restaurant.findById(restaurantId).lean();
    expect(record?.status).toBe('published');
  });

  it('exige el correo para poder confirmar quién la pide', async () => {
    const { contactEmail, ...sinCorreo } = removal;
    void contactEmail;
    const res = await post('/removals', sinCorreo);
    expect(res.status).toBe(422);
    expect(
      res.body.error.details.map((d: { path: string }) => d.path),
    ).toContain('contactEmail');
    expect(await Suggestion.countDocuments()).toBe(0);
  });

  it('da 404 si el local no existe', async () => {
    const res = await post('/removals', {
      ...removal,
      restaurantSlug: 'no-existe',
    });
    expect(res.status).toBe(404);
  });

  it('con el honeypot relleno responde 202 y no guarda nada', async () => {
    const res = await post('/removals', { ...removal, website: 'x' });
    expect(res.status).toBe(202);
    expect(await Suggestion.countDocuments()).toBe(0);
  });
});

describe('tope de envíos', () => {
  it('es uno solo para propuestas, correcciones, equipos y retiradas', async () => {
    const limited = createApp({ ...config, SUBMISSIONS_PER_HOUR: 2 });
    expect((await post('/corrections', correction, limited)).status).toBe(202);
    expect((await post('/removals', removal, limited)).status).toBe(202);

    const res = await post('/removals', removal, limited);
    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBeDefined();
    expect(await Suggestion.countDocuments()).toBe(2);
  });

  it('no gasta cupo con envíos inválidos', async () => {
    const limited = createApp({ ...config, SUBMISSIONS_PER_HOUR: 1 });
    await post('/removals', { ...removal, contactEmail: undefined }, limited);
    expect((await post('/removals', removal, limited)).status).toBe(202);
  });
});
