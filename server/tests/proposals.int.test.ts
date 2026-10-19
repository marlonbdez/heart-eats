import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { Restaurant } from '../src/models/restaurant.js';
import { Suggestion } from '../src/models/suggestion.js';
import { restaurantData } from './helpers/data.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';

const config = {
  CORS_ORIGINS: ['https://hearteats.org'],
  KNOWN_CHAINS: ['gran cadena'],
};
// Cada prueba arranca su propia app: el límite de envíos es por instancia y
// compartirlo haría que las últimas pruebas recibieran 429.
let app: ReturnType<typeof createApp>;
const post = (body: unknown, target = app) =>
  request(target)
    .post('/api/v1/proposals')
    .send(body as object);

const proposal = {
  name: 'Casa Lola',
  street: 'Calle Mayor 5',
  city: 'Madrid',
  postalCode: '28013',
  foodTags: ['tapas'],
  dishes: [{ name: 'Tortilla', description: 'De patata' }],
  howKnown: 'Trabaja una amiga',
  evidenceUrl: 'https://example.org/casa-lola',
  independent: true,
  contactEmail: 'Ana@Example.org',
  locale: 'en',
  website: '',
};

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  app = createApp(config);
  await clearTestDb();
});

describe('POST /api/v1/proposals', () => {
  it('crea una solicitud pendiente y responde 202 con su id', async () => {
    const res = await post(proposal);
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ id: expect.any(String), status: 'pending' });

    const saved = await Suggestion.findById(res.body.id).lean();
    expect(saved).toMatchObject({
      type: 'new',
      status: 'pending',
      contactEmail: 'ana@example.org',
      locale: 'en',
      evidence: ['https://example.org/casa-lola'],
      cityKey: 'madrid',
      warnings: [],
      payload: {
        name: 'Casa Lola',
        street: 'Calle Mayor 5',
        city: 'Madrid',
        foodTags: ['tapas'],
        dishes: [{ name: 'Tortilla', description: 'De patata' }],
        independent: true,
      },
    });
  });

  it('guarda el país y el pin que puso quien propone', async () => {
    const res = await post({
      ...proposal,
      country: 'cu',
      location: { lat: 20.8872, lng: -76.2631 },
    });
    expect(res.status).toBe(202);
    const saved = await Suggestion.findById(res.body.id).lean();
    expect(saved?.country).toBe('CU');
    expect(saved?.payload).toMatchObject({
      country: 'CU',
      location: { lat: 20.8872, lng: -76.2631 },
    });
  });

  it('rechaza un país que no es un código de dos letras o un pin fuera del mundo', async () => {
    expect((await post({ ...proposal, country: 'España' })).status).toBe(422);
    expect(
      (await post({ ...proposal, location: { lat: 95, lng: 0 } })).status,
    ).toBe(422);
    expect(await Suggestion.countDocuments()).toBe(0);
  });

  it('no mete el correo, el idioma ni el honeypot en el contenido', async () => {
    const res = await post(proposal);
    const saved = await Suggestion.findById(res.body.id).lean();
    expect(saved?.payload).not.toHaveProperty('contactEmail');
    expect(saved?.payload).not.toHaveProperty('locale');
    expect(saved?.payload).not.toHaveProperty('website');
    expect(JSON.stringify(res.body)).not.toContain('example.org');
  });

  it('no publica nada', async () => {
    await post(proposal);
    expect(await Restaurant.countDocuments()).toBe(0);
  });

  it('con el honeypot relleno responde 202 igual y no guarda nada', async () => {
    const res = await post({ ...proposal, website: 'https://spam.example' });
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ id: expect.any(String), status: 'pending' });
    expect(await Suggestion.countDocuments()).toBe(0);
  });

  it('el honeypot gana aunque el resto del cuerpo no sea válido', async () => {
    const res = await post({ website: 'x', name: 1 });
    expect(res.status).toBe(202);
    expect(await Suggestion.countDocuments()).toBe(0);
  });

  it('rechaza con 422 y sin repetir lo enviado', async () => {
    const res = await post({ ...proposal, name: 'A', contactEmail: 'mal' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('validation_failed');
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['name', 'contactEmail']));
    expect(JSON.stringify(res.body)).not.toContain('mal"');
    expect(await Suggestion.countDocuments()).toBe(0);
  });

  it('rechaza un cuerpo que no es un objeto', async () => {
    const res = await post([1, 2]);
    expect(res.status).toBe(422);
  });

  it('descarta datos de personas del equipo que lleguen en la propuesta', async () => {
    const res = await post({
      ...proposal,
      stories: [{ displayName: 'Ana', storyText: 'Una historia' }],
      team: { summary: { totalStaff: 9 } },
    });
    const saved = await Suggestion.findById(res.body.id).lean();
    expect(JSON.stringify(saved)).not.toContain('Una historia');
    expect(saved?.payload).not.toHaveProperty('stories');
    expect(saved?.payload).not.toHaveProperty('team');
  });

  describe('filtro automático', () => {
    const warningsOf = async (body: unknown) => {
      const res = await post(body);
      expect(res.status).toBe(202);
      return (await Suggestion.findById(res.body.id).lean())?.warnings;
    };

    it('avisa si no hay enlace de evidencia', async () => {
      expect(await warningsOf({ ...proposal, evidenceUrl: undefined })).toEqual(
        [{ kind: 'noEvidence' }],
      );
    });

    it('avisa si el nombre es de una cadena de la lista', async () => {
      expect(
        await warningsOf({ ...proposal, name: 'La GRAN Cadena Sol' }),
      ).toEqual([{ kind: 'chain' }]);
    });

    it('avisa de un local con el mismo nombre en la ciudad, sin acentos', async () => {
      await Restaurant.create(
        restaurantData({ slug: 'casa-lola', name: 'Casa Lóla' }),
      );
      expect(await warningsOf(proposal)).toEqual([
        { kind: 'duplicate', other: 'Casa Lóla' },
      ]);
    });

    it('avisa de un local en la misma dirección', async () => {
      await Restaurant.create(
        restaurantData({
          slug: 'otro',
          name: 'Otro nombre',
          address: { street: 'calle mayor  5', city: 'Madrid', country: 'ES' },
        }),
      );
      expect(await warningsOf(proposal)).toEqual([
        { kind: 'duplicate', other: 'Otro nombre' },
      ]);
    });

    it('avisa de una propuesta pendiente repetida', async () => {
      await post(proposal);
      expect(await warningsOf({ ...proposal, name: 'casa lola' })).toEqual([
        { kind: 'duplicate', other: 'Casa Lola' },
      ]);
    });

    it('no avisa si el mismo nombre está en otra ciudad', async () => {
      await Restaurant.create(
        restaurantData({
          slug: 'casa-lola-bcn',
          name: 'Casa Lola',
          address: { street: 'Carrer 9', city: 'Barcelona', country: 'ES' },
        }),
      );
      expect(await warningsOf(proposal)).toEqual([]);
    });
  });

  describe('tope de envíos', () => {
    it('da 429 con Retry-After al pasar el máximo por hora', async () => {
      const limited = createApp({ ...config, SUBMISSIONS_PER_HOUR: 2 });
      expect((await post(proposal, limited)).status).toBe(202);
      expect((await post(proposal, limited)).status).toBe(202);

      const res = await post(proposal, limited);
      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('rate_limited');
      expect(res.headers['retry-after']).toBeDefined();
      expect(await Suggestion.countDocuments()).toBe(2);
    });

    it('no gasta cupo con envíos inválidos ni con el honeypot', async () => {
      const limited = createApp({ ...config, SUBMISSIONS_PER_HOUR: 1 });
      await post({ ...proposal, name: 'A' }, limited);
      await post({ ...proposal, website: 'x' }, limited);
      expect((await post(proposal, limited)).status).toBe(202);
      expect((await post(proposal, limited)).status).toBe(429);
    });
  });
});
