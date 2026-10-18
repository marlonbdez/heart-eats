import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { Upload } from '../src/models/upload.js';
import { runMaintenance } from '../src/services/maintenance.js';
import { UPLOAD_TTL_HOURS } from '../src/services/uploads.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { JPEG, memoryPhotoStore, PNG, WEBP } from './helpers/photo-store.js';

const config = { CORS_ORIGINS: ['https://hearteats.org'] };
const HOUR = 3_600_000;

let photos: ReturnType<typeof memoryPhotoStore>;
let app: ReturnType<typeof createApp>;
const upload = (body: Buffer | string, type: string, target = app) =>
  request(target).post('/api/v1/uploads').set('Content-Type', type).send(body);

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  await clearTestDb();
  photos = memoryPhotoStore();
  app = createApp(config, { photoStore: photos.store });
});

describe('POST /uploads', () => {
  it('guarda una foto WebP en cuarentena y devuelve su clave', async () => {
    const res = await upload(WEBP, 'image/webp').expect(201);

    expect(res.body.key).toMatch(/^q\/[0-9a-f-]{36}\.webp$/);
    expect(photos.objects.get(res.body.key)).toEqual({
      body: WEBP,
      contentType: 'image/webp',
    });
    expect(await Upload.findOne({ key: res.body.key })).toMatchObject({
      contentType: 'image/webp',
      size: WEBP.length,
    });
  });

  it('acepta un JPEG', async () => {
    const res = await upload(JPEG, 'image/jpeg').expect(201);
    expect(res.body.key).toMatch(/\.jpg$/);
  });

  it('responde 503 si no hay dónde guardar fotos', async () => {
    const without = createApp(config);
    const res = await upload(WEBP, 'image/webp', without).expect(503);
    expect(res.body.error.code).toBe('uploads_unavailable');
  });

  it('rechaza lo que no se envía como imagen', async () => {
    const res = await upload('{"a":1}', 'application/json').expect(415);
    expect(res.body.error.code).toBe('unsupported_media_type');
    await upload(PNG, 'image/png').expect(415);
    await request(app).post('/api/v1/uploads').expect(415);
  });

  it('rechaza un archivo que dice ser una foto y no lo es', async () => {
    const res = await upload(PNG, 'image/webp').expect(422);
    expect(res.body.error.code).toBe('invalid_image');
    // Una foto JPEG que se anuncia como WebP tampoco vale.
    await upload(JPEG, 'image/webp').expect(422);
    await upload(Buffer.from('texto'), 'image/jpeg').expect(422);
    expect(photos.objects.size).toBe(0);
    expect(await Upload.countDocuments()).toBe(0);
  });

  it('rechaza una foto de más de 1 MB', async () => {
    const big = Buffer.concat([WEBP, Buffer.alloc(1024 * 1024)]);
    const res = await upload(big, 'image/webp').expect(413);
    expect(res.body.error.code).toBe('payload_too_large');
    expect(photos.objects.size).toBe(0);
  });

  it('pone tope por IP, aparte del de los envíos', async () => {
    const limited = createApp(
      { ...config, UPLOADS_PER_HOUR: 2 },
      { photoStore: photos.store },
    );
    await upload(WEBP, 'image/webp', limited).expect(201);
    await upload(WEBP, 'image/webp', limited).expect(201);
    const res = await upload(WEBP, 'image/webp', limited).expect(429);
    expect(res.headers['retry-after']).toBeDefined();
  });

  it('no gasta cupo con una foto que no vale', async () => {
    const limited = createApp(
      { ...config, UPLOADS_PER_HOUR: 1 },
      { photoStore: photos.store },
    );
    await upload(PNG, 'image/webp', limited).expect(422);
    await upload(WEBP, 'image/webp', limited).expect(201);
  });
});

describe('limpieza de fotos sin usar', () => {
  async function stored(ageHours: number, used = false) {
    const res = await upload(WEBP, 'image/webp').expect(201);
    // `createdAt` no se puede cambiar con Mongoose: se envejece en la colección.
    await Upload.collection.updateOne(
      { key: res.body.key },
      {
        $set: {
          createdAt: new Date(Date.now() - ageHours * HOUR),
          ...(used ? { usedAt: new Date() } : {}),
        },
      },
    );
    return res.body.key as string;
  }

  it('borra las que nadie reclamó pasado el plazo', async () => {
    const old = await stored(UPLOAD_TTL_HOURS + 1);
    const fresh = await stored(1);

    await runMaintenance(new Date(), photos.store);

    expect(photos.objects.has(old)).toBe(false);
    expect(await Upload.exists({ key: old })).toBeNull();
    expect(photos.objects.has(fresh)).toBe(true);
    expect(await Upload.exists({ key: fresh })).not.toBeNull();
  });

  it('no toca las que ya usa una solicitud', async () => {
    const used = await stored(UPLOAD_TTL_HOURS + 48, true);

    await runMaintenance(new Date(), photos.store);

    expect(photos.objects.has(used)).toBe(true);
    expect(await Upload.exists({ key: used })).not.toBeNull();
  });

  it('sin almacén, no hace nada', async () => {
    await stored(UPLOAD_TTL_HOURS + 1);
    await runMaintenance();
    expect(await Upload.countDocuments()).toBe(1);
  });
});
