import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { Restaurant } from '../src/models/restaurant.js';
import { Suggestion } from '../src/models/suggestion.js';
import { Upload } from '../src/models/upload.js';
import { closeExpiredRequests } from '../src/services/close-expired.js';
import { UPLOAD_TTL_HOURS } from '../src/services/uploads.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { JPEG, memoryPhotoStore, WEBP } from './helpers/photo-store.js';
import { signedInCookie } from './helpers/session.js';

const WEB = 'https://hearteats.org';
const API = 'https://api.hearteats.org';
const write = { Origin: WEB, 'X-Requested-With': 'fetch' };
const HOUR = 3_600_000;
const PIN = { lat: 40.4153, lng: -3.7074 };

const config = { CORS_ORIGINS: [WEB], API_URL: API };
let photos: ReturnType<typeof memoryPhotoStore>;
let app: ReturnType<typeof createApp>;

const uploadPhoto = (target = app) =>
  request(target).post('/api/v1/uploads').set('Content-Type', 'image/webp');
const idOf = (key: string) => key.replace(/^q\/|\.(webp|jpg)$/g, '');

// Una foto ya subida con su miniatura, lista para usar en un envío.
async function photoWithThumb() {
  const { body } = await uploadPhoto().send(WEBP).expect(201);
  const key = body.key as string;
  await request(app)
    .post(`/api/v1/uploads?thumbOf=${idOf(key)}`)
    .set('Content-Type', 'image/webp')
    .send(WEBP)
    .expect(201);
  return key;
}

const propose = (over: Record<string, unknown> = {}) =>
  request(app)
    .post('/api/v1/proposals')
    .send({
      name: 'Casa Nueva',
      street: 'Calle Mayor 5',
      city: 'Madrid',
      foodTags: ['tapas'],
      dishes: [{ name: 'Tortilla' }],
      independent: true,
      ...over,
    });

const decide = (id: string, body: unknown, cookie: string) =>
  request(app)
    .post(`/api/v1/suggestions/${id}/decision`)
    .set(write)
    .set('Cookie', cookie)
    .send(body as object);

const approve = (over: Record<string, unknown> = {}) => ({
  action: 'approve',
  level: 'admin',
  method: 'visit',
  ownerConfirmed: true,
  location: PIN,
  ...over,
});

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  await clearTestDb();
  photos = memoryPhotoStore();
  app = createApp(config, { photoStore: photos.store });
});

describe('miniatura (POST /uploads?thumbOf=)', () => {
  it('la guarda junto a su foto, con el mismo nombre', async () => {
    const key = await photoWithThumb();
    const thumb = key.replace('.webp', '-thumb.webp');

    expect(photos.objects.has(thumb)).toBe(true);
    expect(await Upload.exists({ key: thumb })).not.toBeNull();
  });

  it('no gasta cupo: la foto ya lo gastó', async () => {
    const limited = createApp(
      { ...config, UPLOADS_PER_HOUR: 1 },
      { photoStore: photos.store },
    );
    const { body } = await uploadPhoto(limited).send(WEBP).expect(201);
    await request(limited)
      .post(`/api/v1/uploads?thumbOf=${idOf(body.key)}`)
      .set('Content-Type', 'image/webp')
      .send(WEBP)
      .expect(201);
    await uploadPhoto(limited).send(WEBP).expect(429);
  });

  it('pide una foto que exista, sin usar y del mismo formato', async () => {
    const thumb = (id: string, type = 'image/webp', body = WEBP) =>
      request(app)
        .post(`/api/v1/uploads?thumbOf=${id}`)
        .set('Content-Type', type)
        .send(body);

    const ghost = '0b8e3a52-5a43-4b8a-9d5e-2f1f3c0a9a11';
    const missing = await thumb(ghost).expect(422);
    expect(missing.body.error.code).toBe('photo_not_found');

    const { body } = await uploadPhoto().send(WEBP).expect(201);
    await thumb(idOf(body.key), 'image/jpeg', JPEG).expect(422);

    const bad = await thumb('no-es-una-foto').expect(422);
    expect(bad.body.error.code).toBe('invalid_thumb_of');
  });

  it('solo admite una miniatura por foto', async () => {
    const key = await photoWithThumb();
    const res = await request(app)
      .post(`/api/v1/uploads?thumbOf=${idOf(key)}`)
      .set('Content-Type', 'image/webp')
      .send(WEBP)
      .expect(409);
    expect(res.body.error.code).toBe('thumb_exists');
  });

  it('pesa menos que una foto: tope de 100 KB', async () => {
    const { body } = await uploadPhoto().send(WEBP).expect(201);
    const big = Buffer.concat([WEBP, Buffer.alloc(101 * 1024)]);
    await request(app)
      .post(`/api/v1/uploads?thumbOf=${idOf(body.key)}`)
      .set('Content-Type', 'image/webp')
      .send(big)
      .expect(413);
  });
});

describe('fotos en una propuesta', () => {
  it('las reclama con su miniatura y las guarda en la solicitud', async () => {
    const place = await photoWithThumb();
    const dish = await photoWithThumb();

    const res = await propose({
      photoKeys: [place],
      dishes: [{ name: 'Tortilla', photoKey: dish }],
    }).expect(202);

    const saved = await Suggestion.findById(res.body.id).lean();
    expect(saved?.payload).toMatchObject({
      photoKeys: [place],
      dishes: [{ name: 'Tortilla', photoKey: dish }],
    });
    for (const key of [place, dish]) {
      for (const k of [key, key.replace('.webp', '-thumb.webp')]) {
        expect((await Upload.findOne({ key: k }))?.usedAt).toBeInstanceOf(Date);
      }
    }
  });

  it('rechaza una foto sin miniatura y no deja ninguna reclamada', async () => {
    const good = await photoWithThumb();
    const { body } = await uploadPhoto().send(WEBP).expect(201);

    const res = await propose({ photoKeys: [good, body.key] }).expect(422);
    expect(res.body.error.code).toBe('photo_unavailable');
    expect(await Suggestion.countDocuments()).toBe(0);
    expect((await Upload.findOne({ key: good }))?.usedAt).toBeUndefined();
  });

  it('una foto solo la puede usar una solicitud', async () => {
    const key = await photoWithThumb();
    await propose({ photoKeys: [key] }).expect(202);
    const again = await propose({ photoKeys: [key] }).expect(422);
    expect(again.body.error.code).toBe('photo_unavailable');
  });

  it('rechaza una foto repetida y las claves que no son de fotos', async () => {
    const key = await photoWithThumb();
    const repeated = await propose({ photoKeys: [key, key] }).expect(422);
    expect(repeated.body.error.code).toBe('photo_repeated');
    await propose({ photoKeys: ['p/otra.webp'] }).expect(422);
    await propose({
      photoKeys: Array.from({ length: 6 }, () => key),
    }).expect(422);
  });

  it('rechaza una foto que ya caducó', async () => {
    const key = await photoWithThumb();
    await Upload.collection.updateMany(
      { key: { $in: [key, key.replace('.webp', '-thumb.webp')] } },
      {
        $set: {
          createdAt: new Date(Date.now() - (UPLOAD_TTL_HOURS + 1) * HOUR),
        },
      },
    );
    await propose({ photoKeys: [key] }).expect(422);
  });

  it('una propuesta sin fotos sigue igual', async () => {
    const res = await propose().expect(202);
    const saved = await Suggestion.findById(res.body.id).lean();
    expect(saved?.payload.photoKeys).toEqual([]);
  });
});

describe('aprobar una propuesta con fotos', () => {
  async function pending() {
    const place = await photoWithThumb();
    const second = await photoWithThumb();
    const dish = await photoWithThumb();
    const res = await propose({
      photoKeys: [place, second],
      dishes: [{ name: 'Tortilla', photoKey: dish }],
    }).expect(202);
    return { id: res.body.id as string, place, second, dish };
  }
  const both = (key: string) => [key, key.replace('.webp', '-thumb.webp')];
  const publicName = (key: string) => key.replace('q/', '');

  it('las pasa de la cuarentena al espacio público y las enseña', async () => {
    const { id, place, second, dish } = await pending();
    const cookie = await signedInCookie();
    await decide(id, approve(), cookie).expect(200);

    for (const key of [place, second, dish]) {
      for (const k of both(key)) {
        expect(photos.objects.has(k)).toBe(false);
        expect(await Upload.exists({ key: k })).toBeNull();
        expect(photos.objects.has(`p/${publicName(k)}`)).toBe(true);
      }
    }

    const slug = (await Restaurant.findOne().lean())!.slug;
    const res = await request(app)
      .get(`/api/v1/restaurants/${slug}`)
      .expect(200);
    expect(res.body.photos).toEqual([
      {
        url: `${API}/api/v1/photos/${publicName(place)}`,
        thumbUrl: `${API}/api/v1/photos/${publicName(place).replace('.webp', '-thumb.webp')}`,
      },
      {
        url: `${API}/api/v1/photos/${publicName(second)}`,
        thumbUrl: `${API}/api/v1/photos/${publicName(second).replace('.webp', '-thumb.webp')}`,
      },
    ]);
    expect(res.body.signatureDishes[0]).toMatchObject({
      name: 'Tortilla',
      photoUrl: `${API}/api/v1/photos/${publicName(dish)}`,
    });
    expect(JSON.stringify(res.body)).not.toContain('q/');
  });

  it('en las listas solo va la portada', async () => {
    const { id, place } = await pending();
    await decide(id, approve(), await signedInCookie()).expect(200);

    const res = await request(app)
      .get('/api/v1/restaurants?country=ES')
      .expect(200);
    expect(res.body.items[0].photos).toHaveLength(1);
    expect(res.body.items[0].photos[0].url).toContain(publicName(place));
  });

  it('deja fuera las que Moderación descarta y las borra', async () => {
    const { id, place, second, dish } = await pending();
    await decide(
      id,
      approve({ skipPhotos: [second, dish] }),
      await signedInCookie(),
    ).expect(200);

    for (const key of [second, dish]) {
      for (const k of both(key)) {
        expect(photos.objects.has(k)).toBe(false);
        expect(photos.objects.has(`p/${publicName(k)}`)).toBe(false);
      }
    }
    expect(photos.objects.has(`p/${publicName(place)}`)).toBe(true);

    const place0 = await Restaurant.findOne().lean();
    expect(place0?.photos).toEqual([{ file: publicName(place) }]);
    expect(place0?.signatureDishes[0]?.photo).toBeUndefined();
  });

  it('sin almacén no se publica nada y la solicitud sigue pendiente', async () => {
    const { id } = await pending();
    const without = createApp(config);
    const res = await request(without)
      .post(`/api/v1/suggestions/${id}/decision`)
      .set(write)
      .set('Cookie', await signedInCookie())
      .send(approve())
      .expect(503);

    expect(res.body.error.code).toBe('uploads_unavailable');
    expect(await Restaurant.countDocuments()).toBe(0);
    expect((await Suggestion.findById(id))?.status).toBe('pending');
  });

  it('si el almacén falla al copiar, no queda nada a medias', async () => {
    const { id } = await pending();
    const failing = {
      ...photos.store,
      copy: (from: string, to: string) =>
        to.endsWith('-thumb.webp')
          ? Promise.reject(new Error('R2 respondió 500 a PUT'))
          : photos.store.copy(from, to),
    };
    const broken = createApp(config, { photoStore: failing });
    const res = await request(broken)
      .post(`/api/v1/suggestions/${id}/decision`)
      .set(write)
      .set('Cookie', await signedInCookie())
      .send(approve())
      .expect(502);

    expect(res.body.error.code).toBe('photo_store_failed');
    expect(await Restaurant.countDocuments()).toBe(0);
    expect((await Suggestion.findById(id))?.status).toBe('pending');
    expect([...photos.objects.keys()].some((k) => k.startsWith('p/'))).toBe(
      false,
    );
  });

  it('anota en la auditoría cuántas fotos se publican, sin las claves', async () => {
    const { id, second } = await pending();
    await decide(id, approve({ skipPhotos: [second] }), await signedInCookie());

    const audit = await request(app)
      .get('/api/v1/audit')
      .set(
        'Cookie',
        await signedInCookie({ email: 'admin@example.org', role: 'admin' }),
      )
      .expect(200);
    const line = audit.body.items.find(
      (i: { entity: string; action: string }) =>
        i.entity === 'restaurant' && i.action === 'create',
    );
    expect(line.diff.photos).toEqual({ published: 2, skipped: 1 });
    expect(JSON.stringify(audit.body)).not.toContain('.webp');
  });
});

describe('rechazar o cerrar una propuesta con fotos', () => {
  it('rechazarla borra sus fotos de la cuarentena', async () => {
    const key = await photoWithThumb();
    const res = await propose({ photoKeys: [key] }).expect(202);

    await decide(
      res.body.id,
      { action: 'reject', reason: 'no_evidence' },
      await signedInCookie(),
    ).expect(200);

    expect(photos.objects.size).toBe(0);
    expect(await Upload.countDocuments()).toBe(0);
  });

  it('si el almacén falla al borrar, la limpieza de cada hora lo reintenta', async () => {
    const key = await photoWithThumb();
    const res = await propose({ photoKeys: [key] }).expect(202);
    const stuck = createApp(config, {
      photoStore: {
        ...photos.store,
        remove: () => Promise.reject(new Error('R2 respondió 500 a DELETE')),
      },
    });
    await request(stuck)
      .post(`/api/v1/suggestions/${res.body.id}/decision`)
      .set(write)
      .set('Cookie', await signedInCookie())
      .send({ action: 'reject', reason: 'other' })
      .expect(200);

    expect(photos.objects.has(key)).toBe(true);
    expect((await Upload.findOne({ key }))?.usedAt).toBeUndefined();
  });

  it('cerrarla por falta de respuesta también las borra', async () => {
    const key = await photoWithThumb();
    const res = await propose({ photoKeys: [key] }).expect(202);
    await Suggestion.collection.updateOne(
      { _id: new (await import('mongoose')).Types.ObjectId(res.body.id) },
      {
        $set: {
          status: 'info_requested',
          infoRequest: {
            note: 'Falta la calle',
            requestedAt: new Date('2020-01-01'),
            deadline: new Date('2020-01-08'),
          },
        },
      },
    );

    expect(await closeExpiredRequests(new Date(), photos.store)).toBe(1);
    expect(photos.objects.size).toBe(0);
    expect(await Upload.countDocuments()).toBe(0);
  });
});

describe('Moderación ve las fotos en cuarentena', () => {
  async function waiting() {
    const place = await photoWithThumb();
    const dish = await photoWithThumb();
    const res = await propose({
      photoKeys: [place],
      dishes: [{ name: 'Tortilla', photoKey: dish }],
    }).expect(202);
    return { id: res.body.id as string, place, dish };
  }

  it('la solicitud lista sus fotos con la clave para dejarlas fuera', async () => {
    const { id, place, dish } = await waiting();
    const res = await request(app)
      .get(`/api/v1/suggestions/${id}`)
      .set('Cookie', await signedInCookie())
      .expect(200);

    const name = place.replace('q/', '');
    expect(res.body.photos).toEqual([
      {
        key: place,
        url: `${API}/api/v1/suggestions/${id}/photos/${name}`,
        thumbUrl: `${API}/api/v1/suggestions/${id}/photos/${name.replace('.webp', '-thumb.webp')}`,
      },
      expect.objectContaining({ key: dish, dish: 'Tortilla' }),
    ]);
  });

  it('se pueden abrir con la sesión, y solo las de esa solicitud', async () => {
    const { id, place } = await waiting();
    const cookie = await signedInCookie();
    const name = place.replace('q/', '');

    const ok = await request(app)
      .get(`/api/v1/suggestions/${id}/photos/${name}`)
      .set('Cookie', cookie)
      .expect(200);
    expect(ok.headers['content-type']).toBe('image/webp');
    expect(ok.headers['cache-control']).toBe('private, no-store');
    expect(Buffer.from(ok.body)).toEqual(WEBP);

    await request(app)
      .get(
        `/api/v1/suggestions/${id}/photos/${name.replace('.webp', '-thumb.webp')}`,
      )
      .set('Cookie', cookie)
      .expect(200);

    const other = await photoWithThumb();
    await request(app)
      .get(`/api/v1/suggestions/${id}/photos/${other.replace('q/', '')}`)
      .set('Cookie', cookie)
      .expect(404);
  });

  it('sin sesión o fuera de su ámbito no se ven', async () => {
    const { id, place } = await waiting();
    const path = `/api/v1/suggestions/${id}/photos/${place.replace('q/', '')}`;

    await request(app).get(path).expect(401);
    const elsewhere = await signedInCookie({
      email: 'otra@example.org',
      moderationScope: [{ country: 'FR', city: 'Paris' }],
    });
    await request(app).get(path).set('Cookie', elsewhere).expect(404);
  });

  it('una vez resuelta, ya no están', async () => {
    const { id, place } = await waiting();
    const cookie = await signedInCookie();
    await decide(id, { action: 'reject', reason: 'other' }, cookie).expect(200);

    await request(app)
      .get(`/api/v1/suggestions/${id}/photos/${place.replace('q/', '')}`)
      .set('Cookie', cookie)
      .expect(404);
    const item = await request(app)
      .get(`/api/v1/suggestions/${id}`)
      .set('Cookie', cookie)
      .expect(200);
    expect(item.body.photos).toBeUndefined();
  });
});

describe('GET /photos/:file', () => {
  async function published() {
    const key = await photoWithThumb();
    const res = await propose({ photoKeys: [key] }).expect(202);
    await decide(res.body.id, approve(), await signedInCookie()).expect(200);
    return key.replace('q/', '');
  }

  it('sirve la foto y su miniatura con caché larga', async () => {
    const file = await published();
    for (const name of [file, file.replace('.webp', '-thumb.webp')]) {
      const res = await request(app).get(`/api/v1/photos/${name}`).expect(200);
      expect(res.headers['content-type']).toBe('image/webp');
      expect(res.headers['cache-control']).toBe(
        'public, max-age=31536000, immutable',
      );
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(Buffer.from(res.body)).toEqual(WEBP);
    }
  });

  it('nunca enseña la cuarentena', async () => {
    const key = await photoWithThumb();
    await request(app)
      .get(`/api/v1/photos/${key.replace('q/', '')}`)
      .expect(404);
    await request(app).get(`/api/v1/photos/${key}`).expect(404);
  });

  it('solo admite nombres de foto, sin rutas ni claves de otros prefijos', async () => {
    await published();
    for (const name of ['..%2Fq%2Fx.webp', 'x.webp', 'p%2Fx.webp', 'a.png']) {
      await request(app).get(`/api/v1/photos/${name}`).expect(404);
    }
  });

  it('sin almacén responde 404', async () => {
    const file = '0b8e3a52-5a43-4b8a-9d5e-2f1f3c0a9a11.webp';
    await request(createApp(config)).get(`/api/v1/photos/${file}`).expect(404);
  });

  it('una foto retirada del almacén deja de verse', async () => {
    const file = await published();
    photos.objects.delete(`p/${file}`);
    await request(app).get(`/api/v1/photos/${file}`).expect(404);
  });
});
