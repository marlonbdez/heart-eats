import { Types } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { AuditLog } from '../src/models/audit-log.js';
import { Restaurant } from '../src/models/restaurant.js';
import { Suggestion } from '../src/models/suggestion.js';
import { Team } from '../src/models/team.js';
import type { Geocoder } from '../src/services/geocoder.js';
import { restaurantData } from './helpers/data.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { signedInCookie } from './helpers/session.js';

const WEB = 'https://hearteats.org';
const write = { Origin: WEB, 'X-Requested-With': 'fetch' };
const CONTACT = 'autora@example.org';
const NEW_PIN = { lat: 40.42, lng: -3.71, country: 'ES' };

let found: typeof NEW_PIN | null;
let geocoded: unknown[];
let names: Record<string, string> = {};
const geocoder: Geocoder = {
  async geocode(query) {
    geocoded.push(query);
    return found;
  },
  async cityNames() {
    return names;
  },
};
const config = {
  CORS_ORIGINS: [WEB],
  WEB_URL: WEB,
  REPLY_TOKEN_SECRET: 'k'.repeat(32),
};
const app = createApp(config, { geocoder });
const plainApp = createApp(config);

const decide = (id: unknown, body: unknown, cookie?: string, target = app) => {
  const req = request(target)
    .post(`/api/v1/suggestions/${String(id)}/decision`)
    .set(write);
  return (cookie ? req.set('Cookie', cookie) : req).send(body as object);
};

const approve = (changes: Record<string, unknown> = {}) => ({
  action: 'approve',
  ...changes,
});

let placeId: Types.ObjectId;

const correction = (over: Record<string, unknown> = {}) =>
  Suggestion.create({
    type: 'edit',
    targetRestaurantId: placeId,
    payload: { kind: 'address', details: 'Ahora está en la calle Nueva 3' },
    contactEmail: CONTACT,
    evidence: [],
    locale: 'es',
    ...over,
  });

const removal = (what: string, over: Record<string, unknown> = {}) =>
  Suggestion.create({
    type: 'removal',
    targetRestaurantId: placeId,
    payload: { what },
    contactEmail: CONTACT,
    evidence: [],
    locale: 'es',
    ...over,
  });

const place = () => Restaurant.findById(placeId).lean();
const stored = (id: unknown) => Suggestion.findById(id).lean();

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  found = NEW_PIN;
  names = {};
  geocoded = [];
  await clearTestDb();
  placeId = (await Restaurant.create(restaurantData()))._id;
});

describe('aprobar una corrección', () => {
  it('cambia el nombre y recalcula la búsqueda', async () => {
    const s = await correction({
      payload: { kind: 'other', details: 'Nombre' },
    });
    const res = await decide(
      s._id,
      approve({ name: 'Casa Renovada' }),
      await signedInCookie(),
    );

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
    const doc = await place();
    expect(doc?.name).toBe('Casa Renovada');
    expect(doc?.searchText).toContain('casa renovada');
    expect(geocoded).toHaveLength(0);
  });

  it('cambia la dirección y geocodifica la dirección ya corregida', async () => {
    const s = await correction();
    await decide(
      s._id,
      approve({ address: { street: 'Calle Nueva 3', postalCode: '28013' } }),
      await signedInCookie(),
    );

    expect(geocoded).toEqual([
      { street: 'Calle Nueva 3', postalCode: '28013', city: 'Madrid' },
    ]);
    const doc = await place();
    expect(doc?.address).toMatchObject({
      street: 'Calle Nueva 3',
      postalCode: '28013',
      city: 'Madrid',
      neighborhood: 'Lavapiés',
      country: 'ES',
    });
    expect(doc?.location.coordinates).toEqual([NEW_PIN.lng, NEW_PIN.lat]);
  });

  it('si cambia la ciudad, guarda su nombre en cada idioma; si no, no lo toca', async () => {
    const cookie = await signedInCookie();
    names = { es: 'Sevilla', en: 'Seville' };
    const moved = await correction();
    await decide(
      moved._id,
      approve({ address: { street: 'Calle Nueva 3', city: 'Sevilla' } }),
      cookie,
    );
    expect((await place())?.address?.cityNames).toEqual(names);

    names = { es: 'Otra', en: 'Other' };
    const same = await correction();
    await decide(
      same._id,
      approve({ address: { street: 'Calle Nueva 4' } }),
      cookie,
    );
    expect((await place())?.address?.cityNames).toEqual({
      es: 'Sevilla',
      en: 'Seville',
    });
  });

  it('un pin a mano manda sobre la geocodificación', async () => {
    const s = await correction();
    await decide(
      s._id,
      approve({
        address: { street: 'Calle Nueva 3' },
        location: { lat: 40.5, lng: -3.6 },
      }),
      await signedInCookie(),
    );
    expect(geocoded).toHaveLength(0);
    expect((await place())?.location.coordinates).toEqual([-3.6, 40.5]);
  });

  it('si la dirección no se puede geocodificar, 422 y nada cambia', async () => {
    found = null;
    const s = await correction();
    const cookie = await signedInCookie();
    const body = approve({ address: { street: 'Calle Nueva 3' } });

    for (const target of [app, plainApp]) {
      const res = await decide(s._id, body, cookie, target);
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('geocoding_required');
    }
    expect((await place())?.address?.street).toBe('Calle 1');
    expect((await stored(s._id))?.status).toBe('pending');
    expect(await AuditLog.countDocuments()).toBe(0);
  });

  it('cambia el horario', async () => {
    const s = await correction({
      payload: { kind: 'hours', details: 'Horario' },
    });
    const openingHours = [{ day: 1, open: '09:00', close: '17:30' }];
    await decide(s._id, approve({ openingHours }), await signedInCookie());
    expect((await place())?.openingHours).toEqual(openingHours);
  });

  it('«cerrado» archiva la ficha: deja de verse en la lectura pública', async () => {
    const s = await correction({
      payload: { kind: 'closed', details: 'Cerró' },
    });
    await decide(s._id, approve({ closed: true }), await signedInCookie());
    expect((await place())?.status).toBe('archived');
    const res = await request(app).get('/api/v1/restaurants/demo-uno');
    expect(res.status).toBe(404);
  });

  it('cierra la solicitud, apunta a la ficha y borra el correo', async () => {
    const s = await correction();
    const cookie = await signedInCookie();
    await decide(s._id, approve({ name: 'Casa Renovada' }), cookie);

    const doc = await stored(s._id);
    expect(doc?.status).toBe('approved');
    expect(doc?.resolution?.restaurantId).toEqual(placeId);
    expect(doc?.contactEmail).toBeUndefined();
    expect(JSON.stringify(doc)).not.toContain(CONTACT);
  });

  it('audita lo que cambia, con antes y después, sin correo', async () => {
    const s = await correction();
    await decide(
      s._id,
      approve({ name: 'Casa Renovada' }),
      await signedInCookie(),
    );

    const logs = await AuditLog.find().sort({ entity: 1 }).lean();
    expect(logs).toHaveLength(2);
    expect(logs[0]).toMatchObject({
      entity: 'restaurant',
      entityId: placeId,
      action: 'update',
      diff: {
        name: { from: '[DEMO] Uno', to: 'Casa Renovada' },
        suggestionId: String(s._id),
      },
    });
    expect(logs[1]).toMatchObject({
      entity: 'suggestion',
      action: 'approve',
      diff: { status: { from: 'pending', to: 'approved' } },
    });
    expect(JSON.stringify(logs)).not.toContain(CONTACT);
  });

  it('exige indicar qué cambia y valida lo que llega', async () => {
    const s = await correction();
    const cookie = await signedInCookie();
    const bad = [
      {},
      { address: {} },
      { name: 'X' },
      { closed: false },
      { location: { lat: 95, lng: 0 } },
      { openingHours: [{ day: 7, open: '09:00', close: '10:00' }] },
      { openingHours: [{ day: 1, open: '9:00', close: '10:00' }] },
    ];
    for (const changes of bad) {
      const res = await decide(s._id, approve(changes), cookie);
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('validation_failed');
    }
    expect((await stored(s._id))?.status).toBe('pending');
  });

  it('si la ficha ya no está publicada, 409 y la solicitud sigue abierta', async () => {
    await Restaurant.updateOne({ _id: placeId }, { status: 'archived' });
    const s = await correction();
    const res = await decide(
      s._id,
      approve({ name: 'Casa Renovada' }),
      await signedInCookie(),
    );
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('target_unavailable');
    expect((await stored(s._id))?.status).toBe('pending');
  });

  it('también se aprueba desde «Info pedida»', async () => {
    const s = await correction({
      status: 'info_requested',
      infoRequest: {
        note: '¿Qué calle?',
        requestedAt: new Date(),
        deadline: new Date(Date.now() + 864e5),
        nonce: 'n',
      },
    });
    const res = await decide(
      s._id,
      approve({ name: 'Casa Renovada' }),
      await signedInCookie(),
    );
    expect(res.status).toBe(200);
    expect((await stored(s._id))?.infoRequest?.nonce).toBeUndefined();
  });

  it('dos aprobaciones a la vez dejan la solicitud aprobada una vez y un solo registro', async () => {
    const s = await correction();
    const cookie = await signedInCookie();
    const results = await Promise.all([
      decide(s._id, approve({ name: 'Casa Uno' }), cookie),
      decide(s._id, approve({ name: 'Casa Dos' }), cookie),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await AuditLog.countDocuments({ entity: 'suggestion' })).toBe(1);
    // Solo el ganador toca la ficha: su cambio es el que queda y el único auditado.
    const logs = await AuditLog.find({ entity: 'restaurant' }).lean();
    expect(logs).toHaveLength(1);
    expect((await place())?.name).toBe(
      (logs[0]?.diff as { name: { to: string } }).name.to,
    );
  });
});

describe('aprobar una retirada', () => {
  const admin = () => signedInCookie({ role: 'admin' });
  const confirmed = (over: Record<string, unknown> = {}) =>
    approve({ identityConfirmed: true, ...over });

  it('un moderador no puede: solo un administrador', async () => {
    const s = await removal('listing');
    const res = await decide(s._id, confirmed(), await signedInCookie());
    expect(res.status).toBe(403);
    expect((await place())?.status).toBe('published');
  });

  it('sin confirmar quién la pide, 422 y no se retira nada', async () => {
    const s = await removal('listing');
    const res = await decide(s._id, approve(), await admin());
    expect(res.status).toBe(422);
    expect((await place())?.status).toBe('published');
    expect((await stored(s._id))?.status).toBe('pending');
  });

  it('retirar la ficha la archiva, cierra la solicitud y borra el correo', async () => {
    const s = await removal('listing');
    const res = await decide(s._id, confirmed(), await admin());

    expect(res.status).toBe(200);
    expect((await place())?.status).toBe('archived');
    const doc = await stored(s._id);
    expect(doc).toMatchObject({ status: 'approved' });
    expect(doc?.contactEmail).toBeUndefined();
    expect(
      (await request(app).get('/api/v1/restaurants/demo-uno')).status,
    ).toBe(404);

    const logs = await AuditLog.find().sort({ entity: 1 }).lean();
    expect(logs).toHaveLength(2);
    expect(logs[0]).toMatchObject({
      entity: 'restaurant',
      action: 'archive',
      diff: { status: { from: 'published', to: 'archived' } },
    });
    expect(JSON.stringify(logs)).not.toContain(CONTACT);
  });

  describe('una historia', () => {
    const stories = [
      {
        displayName: 'Ana',
        role: 'Cocina',
        storyText: 'Texto privado de la historia',
        consentRecordedAt: new Date('2026-09-01T00:00:00Z'),
        consentBy: 'self',
      },
      {
        displayName: 'Luis',
        role: 'Sala',
        storyText: 'Otro texto',
        consentRecordedAt: new Date('2026-09-01T00:00:00Z'),
        consentBy: 'self',
      },
    ];
    let teamId: Types.ObjectId;
    beforeEach(async () => {
      teamId = (
        await Team.create({
          restaurantId: placeId,
          visibilityLevel: 'full',
          summary: { totalStaff: 9, staffWithDisability: 3 },
          stories,
        })
      )._id;
      await Restaurant.updateOne(
        { _id: placeId },
        { ownerConfirmedAt: new Date('2026-09-01T00:00:00Z') },
      );
    });

    it('la marca como retirada al momento y deja de servirse', async () => {
      const s = await removal('story');
      const res = await decide(
        s._id,
        confirmed({ storyIndex: 1 }),
        await admin(),
      );

      expect(res.status).toBe(200);
      const team = await Team.findById(teamId).lean();
      expect(team?.stories?.[0]?.revokedAt).toBeUndefined();
      expect(team?.stories?.[1]?.revokedAt).toBeInstanceOf(Date);
      const pub = await request(app).get('/api/v1/restaurants/demo-uno');
      expect(
        pub.body.team.stories.map(
          (x: { displayName: string }) => x.displayName,
        ),
      ).toEqual(['Ana']);
    });

    it('audita cuál se retira, sin su texto ni su nombre', async () => {
      const s = await removal('story');
      await decide(s._id, confirmed({ storyIndex: 0 }), await admin());
      const log = await AuditLog.findOne({ entity: 'team' }).lean();
      expect(log).toMatchObject({
        entityId: teamId,
        action: 'revoke_story',
        diff: { story: { index: 0, revoked: true } },
      });
      const all = JSON.stringify(await AuditLog.find().lean());
      expect(all).not.toContain('Ana');
      expect(all).not.toContain('Texto privado');
    });

    it('hay que decir cuál, y tiene que existir y no estar ya retirada', async () => {
      const s = await removal('story');
      const cookie = await admin();

      let res = await decide(s._id, confirmed(), cookie);
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('story_required');

      res = await decide(s._id, confirmed({ storyIndex: 2 }), cookie);
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('story_not_found');

      await decide(s._id, confirmed({ storyIndex: 0 }), cookie);
      const again = await removal('story');
      res = await decide(again._id, confirmed({ storyIndex: 0 }), cookie);
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('story_not_found');
      expect((await stored(again._id))?.status).toBe('pending');
    });

    it('sin equipo publicado, 422 story_not_found', async () => {
      await Team.deleteMany({});
      const s = await removal('story');
      const res = await decide(
        s._id,
        confirmed({ storyIndex: 0 }),
        await admin(),
      );
      expect(res.body.error.code).toBe('story_not_found');
    });
  });

  it('fotos y datos todavía no: 501 y no cambia nada', async () => {
    const cookie = await admin();
    for (const what of ['photo', 'data']) {
      const s = await removal(what);
      const res = await decide(s._id, confirmed(), cookie);
      expect(res.status).toBe(501);
      expect((await stored(s._id))?.status).toBe('pending');
    }
    expect((await place())?.status).toBe('published');
    expect(await AuditLog.countDocuments()).toBe(0);
  });
});

describe('aprobar el equipo', () => {
  const admin = () => signedInCookie({ role: 'admin' });
  const confirmed = (over: Record<string, unknown> = {}) =>
    approve({ ownerConfirmed: true, ...over });
  const story = (name: string) => ({
    displayName: name,
    role: 'Cocina',
    storyText: `Historia de ${name}`,
    consentBy: 'self',
  });
  const team = (payload: Record<string, unknown> = {}) =>
    Suggestion.create({
      type: 'team',
      targetRestaurantId: placeId,
      payload: {
        level: 'full',
        summary: { totalStaff: 8, staffWithDisability: 3 },
        areas: ['kitchen'],
        disabilityTypes: ['intellectual_disability'],
        stories: [story('Marta')],
        ...payload,
      },
      contactEmail: CONTACT,
      evidence: [],
      locale: 'es',
    });
  const teamOf = () => Team.findOne({ restaurantId: placeId }).lean();

  it('un moderador no puede: solo un administrador', async () => {
    const s = await team();
    const res = await decide(s._id, confirmed(), await signedInCookie());
    expect(res.status).toBe(403);
    expect(await teamOf()).toBeNull();
  });

  it('sin la confirmación del negocio, 422 y no cambia nada', async () => {
    const s = await team();
    const res = await decide(s._id, approve(), await admin());
    expect(res.status).toBe(422);
    expect(await teamOf()).toBeNull();
    expect((await stored(s._id))?.status).toBe('pending');
  });

  it('crea el equipo con sus historias y el consentimiento de cuando se envió', async () => {
    const s = await team();
    const res = await decide(s._id, confirmed(), await admin());

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
    const doc = await teamOf();
    expect(doc).toMatchObject({
      visibilityLevel: 'full',
      summary: { totalStaff: 8, staffWithDisability: 3 },
      areas: ['kitchen'],
      disabilityTypes: ['intellectual_disability'],
    });
    expect(doc?.stories).toHaveLength(1);
    expect(doc?.stories?.[0]).toMatchObject({
      displayName: 'Marta',
      consentBy: 'self',
    });
    expect(doc?.stories?.[0]?.consentRecordedAt).toEqual(
      (await stored(s._id))?.createdAt,
    );
  });

  it('saca las historias de la solicitud y el correo se borra', async () => {
    const s = await team();
    const res = await decide(s._id, confirmed(), await admin());

    const after = await stored(s._id);
    expect(after?.payload).not.toHaveProperty('stories');
    expect(after?.contactEmail).toBeUndefined();
    expect(res.body.team.stories).toBe(0);
    expect(JSON.stringify(res.body)).not.toContain('Marta');
  });

  it('deja la auditoría sin nombres ni textos', async () => {
    const s = await team();
    await decide(s._id, confirmed(), await admin());

    const lines = await AuditLog.find().lean();
    expect(lines.map((l) => `${l.entity}:${l.action}`).sort()).toEqual([
      'suggestion:approve',
      'team:create',
    ]);
    expect(JSON.stringify(lines)).not.toMatch(/Marta|Historia/);
    expect(lines.find((l) => l.entity === 'team')?.diff).toMatchObject({
      storiesAdded: 1,
    });
  });

  it('actualiza un equipo que ya existe y añade las historias detrás de las que había', async () => {
    await Team.create({
      restaurantId: placeId,
      visibilityLevel: 'medium',
      summary: { totalStaff: 5, staffWithDisability: 1 },
      stories: [
        {
          displayName: 'Antigua',
          role: 'Sala',
          storyText: 'Ya estaba',
          consentRecordedAt: new Date('2026-01-01'),
          consentBy: 'self',
          revokedAt: new Date('2026-02-01'),
        },
      ],
    });
    const s = await team({ areas: undefined, disabilityTypes: undefined });
    await decide(s._id, confirmed(), await admin());

    const doc = await teamOf();
    expect(doc?.visibilityLevel).toBe('full');
    expect(doc?.summary).toMatchObject({
      totalStaff: 8,
      staffWithDisability: 3,
    });
    expect(doc?.stories?.map((x) => x.displayName)).toEqual([
      'Antigua',
      'Marta',
    ]);
    expect(doc?.stories?.[0]?.revokedAt).toBeDefined();
    expect(await Team.countDocuments()).toBe(1);
  });

  it('un equipo sin historias solo cambia las cifras', async () => {
    const s = await team({ level: 'minimal', stories: undefined });
    await decide(s._id, confirmed(), await admin());

    const doc = await teamOf();
    expect(doc?.visibilityLevel).toBe('minimal');
    expect(doc?.stories).toBeUndefined();
  });

  it('si no caben las historias, 422 y nada cambia', async () => {
    await Team.create({
      restaurantId: placeId,
      visibilityLevel: 'full',
      summary: { totalStaff: 8, staffWithDisability: 3 },
      stories: ['A', 'B'].map((displayName) => ({
        displayName,
        role: 'Sala',
        storyText: 'x',
        consentRecordedAt: new Date(),
        consentBy: 'self',
      })),
    });
    const s = await team({ stories: [story('Uno'), story('Dos')] });
    const res = await decide(s._id, confirmed(), await admin());

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('too_many_stories');
    expect((await stored(s._id))?.status).toBe('pending');
    expect((await teamOf())?.stories).toHaveLength(2);
  });

  it('si la ficha ya no está publicada, 409 y nada cambia', async () => {
    await Restaurant.updateOne({ _id: placeId }, { status: 'archived' });
    const s = await team();
    const res = await decide(s._id, confirmed(), await admin());

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('target_unavailable');
    expect(await teamOf()).toBeNull();
  });

  it('al rechazarlo, las historias salen de la solicitud', async () => {
    const s = await team();
    const res = await decide(
      s._id,
      { action: 'reject', reason: 'other' },
      await admin(),
    );

    expect(res.status).toBe(200);
    expect((await stored(s._id))?.payload).not.toHaveProperty('stories');
    expect(await teamOf()).toBeNull();
  });
});
