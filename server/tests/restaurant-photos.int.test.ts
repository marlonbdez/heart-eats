import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { AuditLog } from '../src/models/audit-log.js';
import { Restaurant } from '../src/models/restaurant.js';
import { Upload } from '../src/models/upload.js';
import { restaurantData } from './helpers/data.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { memoryPhotoStore, WEBP } from './helpers/photo-store.js';
import { signedInCookie } from './helpers/session.js';

const WEB = 'https://hearteats.org';
const API = 'https://api.hearteats.org';
const write = { Origin: WEB, 'X-Requested-With': 'fetch' };
const config = { CORS_ORIGINS: [WEB], API_URL: API };

let photos: ReturnType<typeof memoryPhotoStore>;
let app: ReturnType<typeof createApp>;

const idOf = (key: string) => key.replace(/^q\/|\.(webp|jpg)$/g, '');

async function photoWithThumb() {
  const { body } = await request(app)
    .post('/api/v1/uploads')
    .set('Content-Type', 'image/webp')
    .send(WEBP)
    .expect(201);
  await request(app)
    .post(`/api/v1/uploads?thumbOf=${idOf(body.key)}`)
    .set('Content-Type', 'image/webp')
    .send(WEBP)
    .expect(201);
  return body.key as string;
}

const base = '/api/v1/restaurants/demo-uno/photos';
const add = (body: unknown, cookie?: string, path = base) => {
  const req = request(app).post(path).set(write);
  return (cookie ? req.set('Cookie', cookie) : req).send(body as object);
};
const stored = () => Restaurant.findOne({ slug: 'demo-uno' }).lean();

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  await clearTestDb();
  photos = memoryPhotoStore();
  app = createApp(config, { photoStore: photos.store });
  await Restaurant.create(restaurantData());
});

describe('añadir una foto a un local publicado', () => {
  it('la publica directa, sin segunda revisión, y la deja en la ficha', async () => {
    const key = await photoWithThumb();
    const cookie = await signedInCookie();
    const alt = { es: 'La barra con taburetes', en: 'The counter' };

    const res = await add({ photoKey: key, alt }, cookie).expect(201);
    const file = key.replace('q/', '');
    expect(res.body).toEqual({
      url: `${API}/api/v1/photos/${file}`,
      thumbUrl: `${API}/api/v1/photos/${file.replace('.webp', '-thumb.webp')}`,
      alt,
    });

    expect((await stored())?.photos).toEqual([{ file, alt }]);
    expect(photos.objects.has(`p/${file}`)).toBe(true);
    expect(
      photos.objects.has(`p/${file.replace('.webp', '-thumb.webp')}`),
    ).toBe(true);
    // La cuarentena queda vacía.
    expect([...photos.objects.keys()].some((k) => k.startsWith('q/'))).toBe(
      false,
    );
    expect(await Upload.countDocuments()).toBe(0);

    const page = await request(app).get('/api/v1/restaurants/demo-uno');
    expect(page.body.photos[0]).toMatchObject({ alt });
    await request(app).get(`/api/v1/photos/${file}`).expect(200);
  });

  it('con cover, pasa a ser la portada', async () => {
    const cookie = await signedInCookie();
    const first = await photoWithThumb();
    const second = await photoWithThumb();
    await add({ photoKey: first }, cookie).expect(201);
    await add({ photoKey: second, cover: true }, cookie).expect(201);

    const files = (await stored())?.photos?.map((p) => p.file);
    expect(files).toEqual([second, first].map((k) => k.replace('q/', '')));
  });

  it('deja una línea en la auditoría con quién, sin la foto ni el texto', async () => {
    const key = await photoWithThumb();
    await add(
      { photoKey: key, alt: { es: 'Secreto' } },
      await signedInCookie(),
    );

    const lines = await AuditLog.find({ action: 'add_photo' }).lean();
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      entity: 'restaurant',
      diff: { photos: { added: 1 }, cover: false },
    });
    expect(lines[0]?.actorId).toBeDefined();
    expect(JSON.stringify(lines)).not.toContain('Secreto');
    expect(JSON.stringify(lines)).not.toContain('.webp');
  });

  it('pide sesión, la cabecera propia y estar dentro del ámbito', async () => {
    const key = await photoWithThumb();
    await request(app).post(base).send({ photoKey: key }).expect(403);
    await add({ photoKey: key }).expect(401);

    const elsewhere = await signedInCookie({
      email: 'otra@example.org',
      moderationScope: [{ country: 'FR', city: 'Paris' }],
    });
    await add({ photoKey: key }, elsewhere).expect(404);
    const noScope = await signedInCookie({
      email: 'sin@example.org',
      moderationScope: [],
    });
    await add({ photoKey: key }, noScope).expect(404);
    expect((await stored())?.photos).toEqual([]);

    const admin = await signedInCookie({
      email: 'admin@example.org',
      role: 'admin',
      moderationScope: [{ country: 'FR', city: 'Paris' }],
    });
    await add({ photoKey: key }, admin).expect(201);
  });

  it('un local que no existe o no está publicado da 404', async () => {
    const key = await photoWithThumb();
    const cookie = await signedInCookie();
    await add(
      { photoKey: key },
      cookie,
      '/api/v1/restaurants/nada/photos',
    ).expect(404);
    await Restaurant.updateOne({ slug: 'demo-uno' }, { status: 'archived' });
    await add({ photoKey: key }, cookie).expect(404);
  });

  it('valida la clave y el texto alternativo', async () => {
    const cookie = await signedInCookie();
    await add({ photoKey: 'p/otra.webp' }, cookie).expect(422);
    await add({}, cookie).expect(422);
    const key = await photoWithThumb();
    await add({ photoKey: key, alt: {} }, cookie).expect(422);
    await add({ photoKey: key, alt: { es: 'x'.repeat(161) } }, cookie).expect(
      422,
    );
  });

  it('rechaza una foto sin miniatura o ya usada', async () => {
    const cookie = await signedInCookie();
    const { body } = await request(app)
      .post('/api/v1/uploads')
      .set('Content-Type', 'image/webp')
      .send(WEBP);
    const lone = await add({ photoKey: body.key }, cookie).expect(422);
    expect(lone.body.error.code).toBe('photo_unavailable');

    const key = await photoWithThumb();
    await add({ photoKey: key }, cookie).expect(201);
    await add({ photoKey: key }, cookie).expect(422);
  });

  it('sin almacén responde 503', async () => {
    const key = await photoWithThumb();
    const without = createApp(config);
    const res = await request(without)
      .post(base)
      .set(write)
      .set('Cookie', await signedInCookie())
      .send({ photoKey: key })
      .expect(503);
    expect(res.body.error.code).toBe('uploads_unavailable');
  });

  it('con 12 fotos no cabe otra, y la foto vuelve a quedar sin usar', async () => {
    const files = Array.from({ length: 12 }, (_, i) => ({
      file: `0b8e3a52-5a43-4b8a-9d5e-2f1f3c0a9a${String(i).padStart(2, '0')}.webp`,
    }));
    await Restaurant.updateOne({ slug: 'demo-uno' }, { photos: files });
    const key = await photoWithThumb();

    const res = await add({ photoKey: key }, await signedInCookie()).expect(
      422,
    );
    expect(res.body.error.code).toBe('too_many_photos');
    expect((await stored())?.photos).toHaveLength(12);
    expect([...photos.objects.keys()].some((k) => k.startsWith('p/'))).toBe(
      false,
    );
    expect((await Upload.findOne({ key }))?.usedAt).toBeUndefined();
  });

  it('si el almacén falla al copiar, no queda nada a medias', async () => {
    const key = await photoWithThumb();
    const broken = createApp(config, {
      photoStore: {
        ...photos.store,
        copy: () => Promise.reject(new Error('R2 respondió 500 a PUT')),
      },
    });
    const res = await request(broken)
      .post(base)
      .set(write)
      .set('Cookie', await signedInCookie())
      .send({ photoKey: key })
      .expect(502);
    expect(res.body.error.code).toBe('photo_store_failed');
    expect((await stored())?.photos).toEqual([]);
    expect((await Upload.findOne({ key }))?.usedAt).toBeUndefined();
  });
});

describe('cambiar el texto alternativo o la portada', () => {
  async function two() {
    const cookie = await signedInCookie();
    const a = (await photoWithThumb()).replace('q/', '');
    await add({ photoKey: `q/${a}` }, cookie).expect(201);
    const b = (await photoWithThumb()).replace('q/', '');
    await add({ photoKey: `q/${b}` }, cookie).expect(201);
    return { cookie, a, b };
  }
  const change = (file: string, body: unknown, cookie: string) =>
    request(app)
      .put(`${base}/${file}`)
      .set(write)
      .set('Cookie', cookie)
      .send(body as object);

  it('pone y quita el texto alternativo', async () => {
    const { cookie, a } = await two();
    await change(a, { alt: { es: 'Mesas al sol' } }, cookie).expect(204);
    expect((await stored())?.photos?.[0]).toEqual({
      file: a,
      alt: { es: 'Mesas al sol' },
    });
    await change(a, { alt: null }, cookie).expect(204);
    expect((await stored())?.photos?.[0]).toEqual({ file: a });
  });

  it('pasa una foto a portada', async () => {
    const { cookie, a, b } = await two();
    await change(b, { cover: true }, cookie).expect(204);
    expect((await stored())?.photos?.map((p) => p.file)).toEqual([b, a]);
  });

  it('pide algo que cambiar y una foto de la ficha', async () => {
    const { cookie, a } = await two();
    await change(a, {}, cookie).expect(422);
    await change(
      '0b8e3a52-5a43-4b8a-9d5e-2f1f3c0a9a11.webp',
      { cover: true },
      cookie,
    ).expect(404);
    await request(app)
      .put(`${base}/${a}`)
      .set(write)
      .send({ cover: true })
      .expect(401);
  });
});

describe('retirar una foto', () => {
  const remove = (file: string, cookie?: string, target = app) => {
    const req = request(target).delete(`${base}/${file}`).set(write);
    return cookie ? req.set('Cookie', cookie) : req;
  };

  it('deja de verse al momento y se borra del almacén (foto y miniatura)', async () => {
    const cookie = await signedInCookie();
    const file = (await photoWithThumb()).replace('q/', '');
    await add({ photoKey: `q/${file}` }, cookie).expect(201);
    await request(app).get(`/api/v1/photos/${file}`).expect(200);

    await remove(file, cookie).expect(204);

    expect((await stored())?.photos).toEqual([]);
    expect([...photos.objects.keys()]).toEqual([]);
    await request(app).get(`/api/v1/photos/${file}`).expect(404);
    const line = await AuditLog.findOne({ action: 'remove_photo' }).lean();
    expect(line?.diff).toEqual({ photos: { removed: 1 }, from: 'gallery' });
  });

  it('también retira la foto de un plato', async () => {
    const cookie = await signedInCookie();
    const file = (await photoWithThumb()).replace('q/', '');
    photos.objects.set(`p/${file}`, { body: WEBP, contentType: 'image/webp' });
    await Restaurant.updateOne(
      { slug: 'demo-uno' },
      { signatureDishes: [{ name: 'Pizza', photo: file }] },
    );

    await remove(file, cookie).expect(204);

    expect((await stored())?.signatureDishes[0]).toEqual({ name: 'Pizza' });
    expect(photos.objects.has(`p/${file}`)).toBe(false);
  });

  it('no admite miniaturas, nombres raros ni fotos que no son de la ficha', async () => {
    const cookie = await signedInCookie();
    const id = '0b8e3a52-5a43-4b8a-9d5e-2f1f3c0a9a11';
    await remove(`${id}-thumb.webp`, cookie).expect(404);
    await remove('x.webp', cookie).expect(404);
    await remove(`${id}.webp`, cookie).expect(404);
  });

  it('pide sesión y ámbito', async () => {
    const cookie = await signedInCookie();
    const file = (await photoWithThumb()).replace('q/', '');
    await add({ photoKey: `q/${file}` }, cookie).expect(201);

    await remove(file).expect(401);
    const elsewhere = await signedInCookie({
      email: 'otra@example.org',
      moderationScope: [{ country: 'FR' }],
    });
    await remove(file, elsewhere).expect(404);
    expect((await stored())?.photos).toHaveLength(1);
    expect(photos.objects.has(`p/${file}`)).toBe(true);
  });

  it('si el almacén falla, no cambia nada y se puede reintentar', async () => {
    const cookie = await signedInCookie();
    const file = (await photoWithThumb()).replace('q/', '');
    await add({ photoKey: `q/${file}` }, cookie).expect(201);
    const broken = createApp(config, {
      photoStore: {
        ...photos.store,
        remove: () => Promise.reject(new Error('R2 respondió 500 a DELETE')),
      },
    });

    await remove(file, cookie, broken).expect(500);
    expect((await stored())?.photos).toHaveLength(1);

    await remove(file, cookie).expect(204);
    expect((await stored())?.photos).toEqual([]);
  });
});
