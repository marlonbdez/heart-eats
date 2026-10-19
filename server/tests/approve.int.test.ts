import { Types } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { AuditLog } from '../src/models/audit-log.js';
import { Restaurant } from '../src/models/restaurant.js';
import { Suggestion } from '../src/models/suggestion.js';
import type { Geocoder } from '../src/services/geocoder.js';
import type { Approval, Mailer } from '../src/services/mailer.js';
import { slugify } from '../src/services/publish-proposal.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { signedInCookie } from './helpers/session.js';

const WEB = 'https://hearteats.org';
const write = { Origin: WEB, 'X-Requested-With': 'fetch' };
const PIN = { lat: 40.4153, lng: -3.7074, country: 'ES' };
const CONTACT = 'autora@example.org';

let sent: Approval[];
let failMail = false;
const mailer: Mailer = {
  async sendLoginLink() {},
  async sendInfoRequest() {},
  async sendApproval(approval) {
    if (failMail) throw new Error('Resend respondió 500');
    sent.push(approval);
  },
};
let found: typeof PIN | null;
let namesDown = false;
const geocoder: Geocoder = {
  async geocode() {
    return found;
  },
  async cityNames(query, locales) {
    if (namesDown) throw new Error('caído');
    return Object.fromEntries(locales.map((l) => [l, `${query.city}-${l}`]));
  },
};
const config = {
  CORS_ORIGINS: [WEB],
  WEB_URL: WEB,
  REPLY_TOKEN_SECRET: 'k'.repeat(32),
};
const app = createApp(config, { mailer, geocoder });
const plainApp = createApp(config, { mailer });

const approval = (over: Record<string, unknown> = {}) => ({
  action: 'approve',
  level: 'admin',
  method: 'visit',
  ownerConfirmed: true,
  ...over,
});

const decide = (id: unknown, body: unknown, cookie?: string, target = app) => {
  const req = request(target)
    .post(`/api/v1/suggestions/${String(id)}/decision`)
    .set(write);
  return (cookie ? req.set('Cookie', cookie) : req).send(body as object);
};

const payload = (over: Record<string, unknown> = {}) => ({
  name: 'Casa Nueva',
  street: 'Calle Mayor 5',
  postalCode: '28013',
  city: 'Madrid',
  foodTags: ['tapas'],
  dishes: [{ name: 'Tortilla', description: 'De patata' }],
  independent: true,
  ...over,
});

const proposal = (over: Record<string, unknown> = {}) =>
  Suggestion.create({
    type: 'new',
    payload: payload(),
    cityKey: 'madrid',
    contactEmail: CONTACT,
    evidence: ['https://example.org/a'],
    locale: 'es',
    ...over,
  });

const stored = (id: unknown) => Suggestion.findById(id).lean();
const published = () => Restaurant.find({ slug: /^casa-nueva/ }).lean();

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  sent = [];
  failMail = false;
  found = PIN;
  await clearTestDb();
});

describe('aprobar un local nuevo', () => {
  it('publica la ficha con el pin geocodificado, aunque no se haya abierto', async () => {
    const s = await proposal();
    const cookie = await signedInCookie();
    const res = await decide(s._id, approval(), cookie);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
    const [place, ...rest] = await published();
    expect(rest).toHaveLength(0);
    expect(place).toMatchObject({
      slug: 'casa-nueva-madrid',
      name: 'Casa Nueva',
      businessType: 'restaurant',
      foodTags: ['tapas'],
      address: {
        street: 'Calle Mayor 5',
        postalCode: '28013',
        city: 'Madrid',
        country: 'ES',
      },
      location: { type: 'Point', coordinates: [PIN.lng, PIN.lat] },
      signatureDishes: [{ name: 'Tortilla', description: 'De patata' }],
      isIndependent: true,
      status: 'published',
      verification: { level: 'admin', method: 'visit' },
    });
    expect(place?.verification?.lastVerifiedAt).toBeInstanceOf(Date);
    expect(place?.ownerConfirmedAt).toBeInstanceOf(Date);
  });

  it('cierra la solicitud, apunta a la ficha y borra el correo', async () => {
    const s = await proposal();
    const cookie = await signedInCookie();
    await decide(s._id, approval(), cookie);

    const doc = await stored(s._id);
    const [place] = await published();
    expect(doc?.status).toBe('approved');
    expect(doc?.resolution?.restaurantId).toEqual(place?._id);
    expect(doc?.contactEmail).toBeUndefined();
    expect(JSON.stringify(doc)).not.toContain(CONTACT);
  });

  it('avisa a quien propuso con el enlace a la ficha', async () => {
    const s = await proposal({ locale: 'en' });
    await decide(s._id, approval(), await signedInCookie());
    expect(sent).toEqual([
      {
        to: CONTACT,
        url: `${WEB}/en/place/casa-nueva-madrid`,
        name: 'Casa Nueva',
        locale: 'en',
      },
    ]);
  });

  it('sin correo no hay aviso, y si el aviso falla la ficha sigue publicada', async () => {
    const quiet = await proposal({ contactEmail: undefined });
    await decide(quiet._id, approval(), await signedInCookie());
    expect(sent).toHaveLength(0);

    failMail = true;
    const other = await proposal({
      payload: payload({ name: 'Otra Casa' }),
    });
    const res = await decide(
      other._id,
      approval(),
      await signedInCookie({
        email: 'otra@example.org',
      }),
    );
    expect(res.status).toBe(200);
    expect((await stored(other._id))?.status).toBe('approved');
    expect((await stored(other._id))?.contactEmail).toBeUndefined();
  });

  it('deja una línea de auditoría de la solicitud y otra de la ficha, sin correo', async () => {
    const s = await proposal();
    await decide(
      s._id,
      approval({ level: 'community' }),
      await signedInCookie(),
    );

    const [place] = await published();
    const logs = await AuditLog.find().sort({ entity: 1 }).lean();
    expect(logs).toHaveLength(2);
    expect(logs[0]).toMatchObject({
      entity: 'restaurant',
      entityId: place?._id,
      action: 'create',
      diff: { level: 'community', method: 'visit' },
    });
    expect(logs[1]).toMatchObject({
      entity: 'suggestion',
      entityId: s._id,
      action: 'approve',
      diff: { status: { from: 'pending', to: 'approved' } },
    });
    expect(JSON.stringify(logs)).not.toContain(CONTACT);
  });

  it('el tipo de negocio es opcional (restaurante) y se puede elegir', async () => {
    const s = await proposal();
    await decide(
      s._id,
      approval({ businessType: 'bakery' }),
      await signedInCookie(),
    );
    expect((await published())[0]?.businessType).toBe('bakery');
  });

  it('desde «Info pedida» también se aprueba y el enlace de respuesta deja de valer', async () => {
    const s = await proposal({
      status: 'info_requested',
      infoRequest: {
        note: '¿Qué calle?',
        requestedAt: new Date(),
        deadline: new Date(Date.now() + 86_400_000),
        nonce: 'abc',
      },
    });
    const res = await decide(s._id, approval(), await signedInCookie());
    expect(res.status).toBe(200);
    const doc = await stored(s._id);
    expect(doc?.status).toBe('approved');
    expect(doc?.infoRequest?.nonce).toBeUndefined();
  });

  it('la ficha aparece en la lectura pública', async () => {
    const s = await proposal();
    await decide(s._id, approval(), await signedInCookie());
    const res = await request(app).get('/api/v1/restaurants/casa-nueva-madrid');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Casa Nueva');
  });
});

describe('el nombre de la ciudad', () => {
  it('se guarda en cada idioma al publicar', async () => {
    const s = await proposal();
    await decide(s._id, approval(), await signedInCookie());
    expect((await published())[0]?.address?.cityNames).toEqual({
      es: 'Madrid-es',
      en: 'Madrid-en',
    });
  });

  it('si el servicio no responde, se publica igual sin nombres', async () => {
    namesDown = true;
    try {
      const s = await proposal();
      const res = await decide(s._id, approval(), await signedInCookie());
      expect(res.status).toBe(200);
      const [place] = await published();
      expect(place?.address?.city).toBe('Madrid');
      expect(place?.address?.cityNames).toBeUndefined();
    } finally {
      namesDown = false;
    }
  });
});

describe('el pin', () => {
  it('un pin a mano manda sobre la geocodificación', async () => {
    const s = await proposal();
    const location = { lat: 40.42, lng: -3.71 };
    await decide(s._id, approval({ location }), await signedInCookie());
    const [place] = await published();
    expect(place?.location.coordinates).toEqual([location.lng, location.lat]);
    // El país sale de la geocodificación guardada, no se vuelve a pedir.
    expect(place?.address?.country).toBe('ES');
  });

  it('sin geocodificador ni pin a mano, 422 geocoding_required y nada cambia', async () => {
    const s = await proposal();
    const res = await decide(
      s._id,
      approval(),
      await signedInCookie(),
      plainApp,
    );
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('geocoding_required');
    expect((await stored(s._id))?.status).toBe('pending');
    expect(await Restaurant.countDocuments()).toBe(0);
    expect(await AuditLog.countDocuments()).toBe(0);
  });

  it('si no se encontró la dirección, hace falta el pin a mano', async () => {
    found = null;
    const s = await proposal();
    const cookie = await signedInCookie();
    const missing = await decide(s._id, approval(), cookie);
    expect(missing.status).toBe(422);
    expect(missing.body.error.code).toBe('geocoding_required');

    const manual = await decide(
      s._id,
      approval({ location: { lat: 40.42, lng: -3.71 } }),
      cookie,
    );
    expect(manual.status).toBe(200);
    // Sin país del geocodificador, vale el del ámbito (solo uno: ES).
    expect((await published())[0]?.address?.country).toBe('ES');
  });

  it('sin país geocodificado, vale el que dio quien propone', async () => {
    found = null;
    const s = await proposal({ country: 'PT', cityKey: 'lisboa' });
    const cookie = await signedInCookie({
      moderationScope: [
        { country: 'ES', city: 'Madrid' },
        { country: 'PT', city: 'Lisboa' },
      ],
    });
    const res = await decide(
      s._id,
      approval({ location: { lat: 38.72, lng: -9.14 } }),
      cookie,
    );
    expect(res.status).toBe(200);
    expect((await published())[0]?.address?.country).toBe('PT');
  });

  it('con un ámbito de varios países y sin país geocodificado, 422 country_required', async () => {
    found = null;
    const s = await proposal();
    const cookie = await signedInCookie({
      moderationScope: [
        { country: 'ES', city: 'Madrid' },
        { country: 'PT', city: 'Lisboa' },
      ],
    });
    const res = await decide(
      s._id,
      approval({ location: { lat: 40.42, lng: -3.71 } }),
      cookie,
    );
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('country_required');
    expect(await Restaurant.countDocuments()).toBe(0);
  });

  it('un pin fuera de rango no vale', async () => {
    const s = await proposal();
    const res = await decide(
      s._id,
      approval({ location: { lat: 91, lng: 0 } }),
      await signedInCookie(),
    );
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('validation_failed');
  });
});

describe('lo que se exige para aprobar', () => {
  it.each([
    ['sin nivel', { level: undefined }],
    ['con un nivel interno', { level: 'unverified' }],
    ['sin método', { method: undefined }],
    ['con un método desconocido', { method: 'telepathy' }],
    ['sin la confirmación del negocio', { ownerConfirmed: undefined }],
    ['con la confirmación en false', { ownerConfirmed: false }],
    ['con un tipo de negocio desconocido', { businessType: 'casino' }],
  ])('%s: 422 y no se publica nada', async (_name, over) => {
    const s = await proposal();
    const res = await decide(s._id, approval(over), await signedInCookie());
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('validation_failed');
    expect((await stored(s._id))?.status).toBe('pending');
    expect(await Restaurant.countDocuments()).toBe(0);
    expect(await AuditLog.countDocuments()).toBe(0);
  });

  it('una propuesta sin calle no se publica: hay que pedirla', async () => {
    const s = await proposal({ payload: payload({ street: undefined }) });
    const res = await decide(
      s._id,
      approval({ location: { lat: 40.42, lng: -3.71 } }),
      await signedInCookie(),
    );
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('proposal_incomplete');
    expect((await stored(s._id))?.status).toBe('pending');
    expect(await Restaurant.countDocuments()).toBe(0);
  });

  it('una propuesta sin categoría de comida tampoco', async () => {
    const s = await proposal({ payload: payload({ foodTags: [] }) });
    const res = await decide(s._id, approval(), await signedInCookie());
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('proposal_incomplete');
    expect(await Restaurant.countDocuments()).toBe(0);
  });
});

describe('acceso y estado', () => {
  it('sin sesión, 401', async () => {
    const s = await proposal();
    expect((await decide(s._id, approval())).status).toBe(401);
  });

  it('fuera del ámbito, 404 y no se publica', async () => {
    const s = await proposal();
    const cookie = await signedInCookie({
      moderationScope: [{ country: 'FR', city: 'Paris' }],
    });
    const res = await decide(s._id, approval(), cookie);
    expect(res.status).toBe(404);
    expect(await Restaurant.countDocuments()).toBe(0);
    expect(
      (await decide(new Types.ObjectId(), approval(), cookie)).status,
    ).toBe(404);
  });

  it('una solicitud ya resuelta no se vuelve a decidir', async () => {
    const s = await proposal();
    const cookie = await signedInCookie();
    await decide(s._id, approval(), cookie);
    const again = await decide(s._id, approval(), cookie);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('already_resolved');
    expect(await published()).toHaveLength(1);

    const rejected = await proposal({ status: 'rejected' });
    expect((await decide(rejected._id, approval(), cookie)).status).toBe(409);
  });

  it('dos aprobaciones a la vez dejan una sola ficha', async () => {
    const s = await proposal();
    const cookie = await signedInCookie();
    const results = await Promise.all([
      decide(s._id, approval(), cookie),
      decide(s._id, approval(), cookie),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await published()).toHaveLength(1);
    const [place] = await published();
    expect((await stored(s._id))?.resolution?.restaurantId).toEqual(place?._id);
  });
});

describe('el slug', () => {
  it('si ya existe, añade un número', async () => {
    const first = await proposal();
    const second = await proposal();
    const cookie = await signedInCookie();
    await decide(first._id, approval(), cookie);
    await decide(second._id, approval(), cookie);
    const slugs = (await published()).map((r) => r.slug).sort();
    expect(slugs).toEqual(['casa-nueva-madrid', 'casa-nueva-madrid-2']);
  });

  it('sin acentos ni símbolos, y siempre con algo', () => {
    expect(slugify('Café  «Ñandú» & Co.')).toBe('cafe-nandu-co');
    expect(slugify('¡¿?!')).toBe('local');
    expect(slugify('a'.repeat(100))).toHaveLength(70);
  });
});
