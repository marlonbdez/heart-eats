import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { AuditLog } from '../src/models/audit-log.js';
import { Restaurant } from '../src/models/restaurant.js';
import { Suggestion } from '../src/models/suggestion.js';
import { Team } from '../src/models/team.js';
import { Upload } from '../src/models/upload.js';
import {
  purgeRetiredListings,
  purgeRevokedStories,
  REVOKED_STORY_DAYS,
  RETIRED_LISTING_DAYS,
} from '../src/services/retention.js';
import { restaurantData } from './helpers/data.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { memoryPhotoStore, WEBP } from './helpers/photo-store.js';
import { signedInCookie } from './helpers/session.js';

const WEB = 'https://hearteats.org';
const API = 'https://api.hearteats.org';
const write = { Origin: WEB, 'X-Requested-With': 'fetch' };
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

const config = { CORS_ORIGINS: [WEB], API_URL: API };
let photos: ReturnType<typeof memoryPhotoStore>;
let app: ReturnType<typeof createApp>;

const idOf = (key: string) => key.replace(/^q\/|\.(webp|jpg)$/g, '');
const thumbOf = (key: string) => key.replace('.webp', '-thumb.webp');
const publicName = (key: string) => key.replace('q/', '');
const both = (key: string) => [key, thumbOf(key)];

// Una foto ya subida con su miniatura, lista para usar en un envío.
async function photoWithThumb() {
  const { body } = await request(app)
    .post('/api/v1/uploads')
    .set('Content-Type', 'image/webp')
    .send(WEBP)
    .expect(201);
  const key = body.key as string;
  await request(app)
    .post(`/api/v1/uploads?thumbOf=${idOf(key)}`)
    .set('Content-Type', 'image/webp')
    .send(WEBP)
    .expect(201);
  return key;
}

const story = (name: string, photoKey?: string) => ({
  displayName: name,
  role: 'Cocina',
  storyText: `Historia de ${name}`,
  consentBy: 'self',
  ...(photoKey ? { photoKey } : {}),
});

const sendTeam = (over: Record<string, unknown> = {}) =>
  request(app)
    .post('/api/v1/teams')
    .send({
      restaurantSlug: 'demo-uno',
      level: 'full',
      summary: { totalStaff: 8, staffWithDisability: 3 },
      areas: ['kitchen'],
      disabilityTypes: ['intellectual_disability'],
      contactEmail: 'negocio@example.org',
      locale: 'es',
      ...over,
    });

const decide = (id: string, body: unknown, cookie: string, target = app) =>
  request(target)
    .post(`/api/v1/suggestions/${id}/decision`)
    .set(write)
    .set('Cookie', cookie)
    .send(body as object);

const approve = (over: Record<string, unknown> = {}) => ({
  action: 'approve',
  ownerConfirmed: true,
  ...over,
});

const admin = () => signedInCookie({ role: 'admin' });

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  await clearTestDb();
  photos = memoryPhotoStore();
  app = createApp(config, { photoStore: photos.store });
  await Restaurant.create(
    restaurantData({ ownerConfirmedAt: new Date('2026-09-01') }),
  );
});

describe('enviar el equipo con fotos (POST /teams)', () => {
  it('reclama la foto de cada historia y su miniatura', async () => {
    const key = await photoWithThumb();
    const res = await sendTeam({ stories: [story('Marta', key)] }).expect(202);

    const saved = await Suggestion.findById(res.body.id).lean();
    expect(saved?.payload.stories).toMatchObject([
      { displayName: 'Marta', photoKey: key },
    ]);
    for (const k of both(key)) {
      expect((await Upload.findOne({ key: k }))?.usedAt).toBeInstanceOf(Date);
    }
  });

  it('una historia sin foto sigue igual', async () => {
    const res = await sendTeam({ stories: [story('Marta')] }).expect(202);
    const saved = await Suggestion.findById(res.body.id).lean();
    expect(saved?.payload.stories?.[0]).not.toHaveProperty('photoKey');
  });

  it('rechaza una foto sin miniatura, repetida o que no es de la cuarentena', async () => {
    const good = await photoWithThumb();
    const { body } = await request(app)
      .post('/api/v1/uploads')
      .set('Content-Type', 'image/webp')
      .send(WEBP)
      .expect(201);

    const noThumb = await sendTeam({
      stories: [story('Marta', good), story('Luis', body.key)],
    }).expect(422);
    expect(noThumb.body.error.code).toBe('photo_unavailable');
    expect(await Suggestion.countDocuments()).toBe(0);
    expect((await Upload.findOne({ key: good }))?.usedAt).toBeUndefined();

    const repeated = await sendTeam({
      stories: [story('Marta', good), story('Luis', good)],
    }).expect(422);
    expect(repeated.body.error.code).toBe('photo_repeated');
    await sendTeam({ stories: [story('Marta', 'p/otra.webp')] }).expect(422);
  });

  it('en un nivel que no publica historias, la foto no se reclama', async () => {
    const key = await photoWithThumb();
    const res = await sendTeam({
      level: 'medium',
      stories: [story('Marta', key)],
    }).expect(202);

    const saved = await Suggestion.findById(res.body.id).lean();
    expect(saved?.payload.stories).toBeUndefined();
    expect((await Upload.findOne({ key }))?.usedAt).toBeUndefined();
  });
});

describe('Moderación y las fotos de las personas del equipo', () => {
  async function waiting() {
    const key = await photoWithThumb();
    const res = await sendTeam({ stories: [story('Marta', key)] }).expect(202);
    return { id: res.body.id as string, key };
  }

  it('el administrador la ve en la historia y puede abrirla; un moderador, no', async () => {
    const { id, key } = await waiting();
    const file = publicName(key);

    const open = await request(app)
      .get(`/api/v1/suggestions/${id}`)
      .set('Cookie', await admin())
      .expect(200);
    expect(open.body.team.storyTexts[0].photo).toEqual({
      key,
      url: `${API}/api/v1/suggestions/${id}/photos/${file}`,
      thumbUrl: `${API}/api/v1/suggestions/${id}/photos/${thumbOf(file)}`,
    });
    await request(app)
      .get(`/api/v1/suggestions/${id}/photos/${file}`)
      .set(
        'Cookie',
        await signedInCookie({ email: 'otra@example.org', role: 'admin' }),
      )
      .expect(200)
      .expect('Content-Type', 'image/webp');

    const moderator = await signedInCookie({ email: 'mod@example.org' });
    const seen = await request(app)
      .get(`/api/v1/suggestions/${id}`)
      .set('Cookie', moderator)
      .expect(200);
    expect(JSON.stringify(seen.body)).not.toContain(file);
    await request(app)
      .get(`/api/v1/suggestions/${id}/photos/${file}`)
      .set('Cookie', moderator)
      .expect(404);
  });
});

describe('aprobar el equipo con fotos', () => {
  async function waiting(names = ['Marta']) {
    const keys: string[] = [];
    for (let i = 0; i < names.length; i++) keys.push(await photoWithThumb());
    const res = await sendTeam({
      stories: names.map((n, i) => story(n, keys[i])),
    }).expect(202);
    return { id: res.body.id as string, keys };
  }

  it('la pasa de la cuarentena al espacio público, la guarda en la historia y la enseña pequeña', async () => {
    const { id, keys } = await waiting();
    const [key] = keys as [string];
    await decide(id, approve(), await admin()).expect(200);

    for (const k of both(key)) {
      expect(photos.objects.has(k)).toBe(false);
      expect(await Upload.exists({ key: k })).toBeNull();
      expect(photos.objects.has(`p/${publicName(k)}`)).toBe(true);
    }
    const team = await Team.findOne().lean();
    expect(team?.stories?.[0]?.photo).toBe(publicName(key));

    const res = await request(app)
      .get('/api/v1/restaurants/demo-uno')
      .expect(200);
    expect(res.body.team.stories[0].photoUrl).toBe(
      `${API}/api/v1/photos/${thumbOf(publicName(key))}`,
    );
    expect(JSON.stringify(res.body)).not.toContain('q/');
    await request(app)
      .get(`/api/v1/photos/${thumbOf(publicName(key))}`)
      .expect(200);
  });

  it('deja fuera la que Moderación descarta: la historia sale sin foto y se borra', async () => {
    const { id, keys } = await waiting(['Marta', 'Luis']);
    const [first, second] = keys as [string, string];
    await decide(id, approve({ skipPhotos: [second] }), await admin()).expect(
      200,
    );

    const team = await Team.findOne().lean();
    expect(team?.stories?.[0]?.photo).toBe(publicName(first));
    expect(team?.stories?.[1]?.photo).toBeUndefined();
    for (const k of both(second)) {
      expect(photos.objects.has(k)).toBe(false);
      expect(photos.objects.has(`p/${publicName(k)}`)).toBe(false);
    }
  });

  it('la auditoría anota cuántas fotos, sin nombres, textos ni archivos', async () => {
    const { id, keys } = await waiting(['Marta', 'Luis']);
    await decide(id, approve({ skipPhotos: [keys[1]!] }), await admin()).expect(
      200,
    );

    const entry = await AuditLog.findOne({ entity: 'team' }).lean();
    expect(entry?.diff).toMatchObject({
      storiesAdded: 2,
      photos: { published: 1, skipped: 1 },
    });
    const text = JSON.stringify(entry);
    expect(text).not.toMatch(/Marta|Luis|Historia|webp/);
  });

  it('sin almacén no se publica nada y la solicitud sigue pendiente', async () => {
    const { id } = await waiting();
    const without = createApp(config);
    const res = await decide(id, approve(), await admin(), without).expect(503);

    expect(res.body.error.code).toBe('uploads_unavailable');
    expect(await Team.countDocuments()).toBe(0);
    expect((await Suggestion.findById(id))?.status).toBe('pending');
  });

  it('un fallo al guardar el equipo deja las fotos como estaban', async () => {
    const { id, keys } = await waiting();
    // Ya hay tres historias: no caben más y el equipo no se guarda.
    await Team.create({
      restaurantId: (await Restaurant.findOne())!._id,
      visibilityLevel: 'full',
      summary: { totalStaff: 8, staffWithDisability: 3 },
      stories: ['A', 'B', 'C'].map((n) => ({
        displayName: n,
        role: 'Sala',
        storyText: n,
        consentRecordedAt: new Date(),
        consentBy: 'self',
      })),
    });
    await decide(id, approve(), await admin()).expect(422);

    expect(photos.objects.has(`p/${publicName(keys[0]!)}`)).toBe(false);
    expect(photos.objects.has(keys[0]!)).toBe(true);
  });

  it('rechazarlo borra las fotos de la cuarentena', async () => {
    const { id } = await waiting();
    await decide(
      id,
      { action: 'reject', reason: 'no_evidence' },
      await admin(),
    ).expect(200);

    expect(photos.objects.size).toBe(0);
    expect(await Upload.countDocuments()).toBe(0);
  });
});

describe('borrado de las fotos de las personas del equipo', () => {
  async function publishedTeam(over: Record<string, unknown> = {}) {
    const file = `${'0b8e3a52-5a43-4b8a-9d5e-2f1f3c0a9a11'}.webp`;
    await photos.store.put(`p/${file}`, WEBP, 'image/webp');
    await photos.store.put(`p/${thumbOf(file)}`, WEBP, 'image/webp');
    const place = (await Restaurant.findOne())!;
    await Team.create({
      restaurantId: place._id,
      visibilityLevel: 'full',
      summary: { totalStaff: 8, staffWithDisability: 3 },
      stories: [
        {
          displayName: 'Marta',
          role: 'Cocina',
          storyText: 'Historia',
          photo: file,
          consentRecordedAt: daysAgo(100),
          consentBy: 'self',
          revokedAt: daysAgo(REVOKED_STORY_DAYS + 1),
          ...over,
        },
      ],
    });
    return { file, place };
  }

  it('al vaciar una historia retirada se borran su foto y su miniatura', async () => {
    await publishedTeam();
    expect(await purgeRevokedStories(new Date(), photos.store)).toBe(1);

    expect(photos.objects.size).toBe(0);
    const story = (await Team.findOne().lean())?.stories?.[0];
    expect(story?.purgedAt).toBeInstanceOf(Date);
    expect(story).not.toHaveProperty('photo');
    expect(story).not.toHaveProperty('displayName');
  });

  it('sin almacén no se vacía una historia con foto, para no dejarla huérfana', async () => {
    await publishedTeam();
    expect(await purgeRevokedStories()).toBe(0);

    const story = (await Team.findOne().lean())?.stories?.[0];
    expect(story?.purgedAt).toBeUndefined();
    expect(story?.photo).toBeDefined();
    expect(photos.objects.size).toBe(2);
  });

  it('si falla el almacén, la historia se queda para reintentarla', async () => {
    await publishedTeam();
    const failing = {
      ...photos.store,
      remove: () => Promise.reject(new Error('R2 respondió 500 a DELETE')),
    };
    expect(await purgeRevokedStories(new Date(), failing)).toBe(0);
    expect(
      (await Team.findOne().lean())?.stories?.[0]?.purgedAt,
    ).toBeUndefined();

    expect(await purgeRevokedStories(new Date(), photos.store)).toBe(1);
  });

  it('al borrar una ficha retirada también se borran las fotos de su equipo', async () => {
    const { place } = await publishedTeam({ revokedAt: undefined });
    await Restaurant.updateOne(
      { _id: place._id },
      {
        status: 'archived',
        retiredAt: daysAgo(RETIRED_LISTING_DAYS + 1),
      },
    );
    expect(await purgeRetiredListings(new Date(), photos.store)).toBe(1);

    expect(photos.objects.size).toBe(0);
    expect(await Team.countDocuments()).toBe(0);
  });
});
