import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { AuditLog } from '../src/models/audit-log.js';
import { Restaurant } from '../src/models/restaurant.js';
import { Suggestion } from '../src/models/suggestion.js';
import { closeExpiredRequests } from '../src/services/close-expired.js';
import type { InfoRequest, Mailer } from '../src/services/mailer.js';
import {
  REPLY_DAYS,
  REPLY_GRACE_DAYS,
  signReplyToken,
} from '../src/services/reply-token.js';
import { restaurantData } from './helpers/data.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { signedInCookie } from './helpers/session.js';

const WEB = 'https://hearteats.org';
const SECRET = 'k'.repeat(32);
const write = { Origin: WEB, 'X-Requested-With': 'fetch' };
const DAY = 86_400_000;

let sent: InfoRequest[];
const mailer: Mailer = {
  async sendLoginLink() {},
  async sendInfoRequest(info) {
    sent.push(info);
  },
  async sendApproval() {},
};
const app = createApp(
  { CORS_ORIGINS: [WEB], WEB_URL: WEB, REPLY_TOKEN_SECRET: SECRET },
  { mailer },
);

const proposal = (over: Record<string, unknown> = {}) =>
  Suggestion.create({
    type: 'new',
    payload: {
      name: 'Casa Nueva',
      street: 'Calle Mayor 5',
      city: 'Madrid',
      foodTags: ['tapas'],
      dishes: [],
    },
    cityKey: 'madrid',
    contactEmail: 'ana@example.org',
    evidence: [],
    ...over,
  });

// Moderación pide información y devuelve el token del correo.
async function askInfo(id: unknown, cookie: string, note = '¿Tiene web?') {
  const res = await request(app)
    .post(`/api/v1/suggestions/${String(id)}/decision`)
    .set(write)
    .set('Cookie', cookie)
    .send({ action: 'ask_info', note });
  expect(res.status).toBe(200);
  return sent.at(-1)!.url.split('#token=')[1]!;
}

const get = (token: string) => request(app).get(`/api/v1/replies/${token}`);
const reply = (token: string, body: unknown) =>
  request(app)
    .post(`/api/v1/replies/${token}`)
    .send(body as object);
const stored = (id: unknown) => Suggestion.findById(id).lean();

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  sent = [];
  await clearTestDb();
});

describe('GET /replies/:token', () => {
  it('devuelve la nota, el plazo y el nombre, sin el correo', async () => {
    const s = await proposal();
    const token = await askInfo(s._id, await signedInCookie());
    const res = await get(token);
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toEqual({
      name: 'Casa Nueva',
      note: '¿Tiene web?',
      deadline: (await stored(s._id))!.infoRequest!.deadline.toISOString(),
      locale: 'es',
    });
    expect(JSON.stringify(res.body)).not.toContain('ana@');
  });

  it('en una corrección, el nombre es el del local', async () => {
    const place = await Restaurant.create(restaurantData({ name: 'Bar Uno' }));
    const s = await proposal({
      type: 'edit',
      targetRestaurantId: place._id,
      payload: { kind: 'address', details: 'Calle Nueva 1' },
    });
    const res = await get(await askInfo(s._id, await signedInCookie()));
    expect(res.body.name).toBe('Bar Uno');
  });

  it.each([
    ['basura', 'no-es-un-token'],
    ['firma de otro secreto', null],
  ])('un enlace manipulado (%s) da 404', async (_name, token) => {
    const forged =
      token ??
      signReplyToken('otro-secreto'.repeat(4), {
        suggestionId: String((await proposal())._id),
        expiresAt: new Date(Date.now() + DAY),
        nonce: 'x',
      });
    const res = await get(forged);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
  });

  it('un enlace caducado da 404', async () => {
    const s = await proposal();
    await askInfo(s._id, await signedInCookie());
    const doc = await stored(s._id);
    const token = signReplyToken(SECRET, {
      suggestionId: String(s._id),
      expiresAt: new Date(Date.now() - 1000),
      nonce: doc!.infoRequest!.nonce!,
    });
    expect((await get(token)).status).toBe(404);
  });

  it('el enlace antiguo deja de valer cuando se pide información otra vez', async () => {
    const s = await proposal();
    const cookie = await signedInCookie();
    const first = await askInfo(s._id, cookie);
    await reply(first, { message: 'Sí' });
    const second = await askInfo(s._id, cookie, '¿Y el horario?');
    expect((await get(first)).status).toBe(404);
    expect((await get(second)).body.note).toBe('¿Y el horario?');
  });
});

describe('POST /replies/:token', () => {
  it('guarda la respuesta, vuelve a pendiente e invalida el enlace', async () => {
    const s = await proposal();
    const token = await askInfo(s._id, await signedInCookie());
    const res = await reply(token, { message: '  Sí, hearteats.example  ' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ status: 'received' });

    const doc = await stored(s._id);
    expect(doc?.status).toBe('pending');
    expect(doc?.replies).toHaveLength(1);
    expect(doc?.replies[0]).toMatchObject({ message: 'Sí, hearteats.example' });
    expect(doc?.infoRequest?.nonce).toBeUndefined();
    expect(doc?.contactEmail).toBe('ana@example.org'); // sigue hasta resolver

    expect((await reply(token, { message: 'Otra vez' })).status).toBe(404);
    expect((await get(token)).status).toBe(404);
    expect((await stored(s._id))?.replies).toHaveLength(1);
  });

  it('Moderación ve lo pedido y la respuesta', async () => {
    const s = await proposal();
    const cookie = await signedInCookie();
    await reply(await askInfo(s._id, cookie), { message: 'Es de la familia' });
    const res = await request(app)
      .get(`/api/v1/suggestions/${String(s._id)}`)
      .set('Cookie', cookie);
    expect(res.body.status).toBe('pending');
    expect(res.body.infoRequest.note).toBe('¿Tiene web?');
    expect(res.body.replies).toEqual([
      { message: 'Es de la familia', at: expect.any(String) },
    ]);
  });

  it.each([
    ['vacío', { message: '   ' }],
    ['sin mensaje', {}],
    ['demasiado largo', { message: 'a'.repeat(2001) }],
    ['no es texto', { message: 7 }],
  ])(
    'un mensaje inválido (%s) da 422 y no gasta el enlace',
    async (_n, body) => {
      const s = await proposal();
      const token = await askInfo(s._id, await signedInCookie());
      expect((await reply(token, body)).status).toBe(422);
      expect((await stored(s._id))?.status).toBe('info_requested');
      expect((await get(token)).status).toBe(200);
    },
  );

  it('dos respuestas a la vez guardan solo una', async () => {
    const s = await proposal();
    const token = await askInfo(s._id, await signedInCookie());
    const results = await Promise.all([
      reply(token, { message: 'Una' }),
      reply(token, { message: 'Dos' }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 404]);
    expect((await stored(s._id))?.replies).toHaveLength(1);
  });

  it('si Moderación ya la rechazó, el enlace da 404', async () => {
    const s = await proposal();
    const cookie = await signedInCookie();
    const token = await askInfo(s._id, cookie);
    await request(app)
      .post(`/api/v1/suggestions/${String(s._id)}/decision`)
      .set(write)
      .set('Cookie', cookie)
      .send({ action: 'reject', reason: 'other' });
    expect((await reply(token, { message: 'Tarde' })).status).toBe(404);
    expect((await stored(s._id))?.replies).toHaveLength(0);
  });
});

describe('cierre automático', () => {
  const asked = async (daysAgo: number, over: Record<string, unknown> = {}) => {
    const requestedAt = new Date(Date.now() - daysAgo * DAY);
    return proposal({
      status: 'info_requested',
      infoRequest: {
        note: '¿Tiene web?',
        requestedAt,
        deadline: new Date(requestedAt.getTime() + REPLY_DAYS * DAY),
        nonce: 'n',
      },
      ...over,
    });
  };

  it('no cierra dentro del plazo ni dentro del margen de cortesía', async () => {
    const inTime = await asked(REPLY_DAYS - 1);
    const grace = await asked(REPLY_DAYS + REPLY_GRACE_DAYS - 1);
    expect(await closeExpiredRequests()).toBe(0);
    expect((await stored(inTime._id))?.status).toBe('info_requested');
    expect((await stored(grace._id))?.status).toBe('info_requested');
  });

  it('cierra la que pasó el plazo y el margen: rechazada, sin correo, con auditoría', async () => {
    const s = await asked(REPLY_DAYS + REPLY_GRACE_DAYS + 1);
    const now = new Date();
    expect(await closeExpiredRequests(now)).toBe(1);

    const doc = await stored(s._id);
    expect(doc).toMatchObject({
      status: 'rejected',
      resolution: { reason: 'no_reply', decidedAt: now },
    });
    expect(doc?.resolution?.decidedBy).toBeUndefined();
    expect(doc?.contactEmail).toBeUndefined();
    expect(doc?.infoRequest?.nonce).toBeUndefined();

    const log = await AuditLog.find({ entityId: s._id }).lean();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      action: 'auto_close',
      diff: {
        status: { from: 'info_requested', to: 'rejected' },
        reason: 'no_reply',
      },
    });
    expect(log[0]?.actorId).toBeUndefined();
    expect(JSON.stringify(log)).not.toContain('ana@');
  });

  it('el enlace de una solicitud cerrada da 404', async () => {
    const s = await proposal();
    const token = await askInfo(s._id, await signedInCookie());
    const future = new Date(
      Date.now() + (REPLY_DAYS + REPLY_GRACE_DAYS + 1) * DAY,
    );
    expect(await closeExpiredRequests(future)).toBe(1);
    expect((await get(token)).status).toBe(404);
  });

  it('no toca las pendientes ni las ya resueltas, y es idempotente', async () => {
    const pending = await proposal();
    const done = await asked(100, { status: 'approved' });
    const old = await asked(100);
    expect(await closeExpiredRequests()).toBe(1);
    expect(await closeExpiredRequests()).toBe(0);
    expect((await stored(pending._id))?.status).toBe('pending');
    expect((await stored(done._id))?.status).toBe('approved');
    expect((await stored(old._id))?.status).toBe('rejected');
    expect(await AuditLog.countDocuments()).toBe(1);
  });
});
