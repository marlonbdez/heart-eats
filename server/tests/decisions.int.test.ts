import { Types } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { AuditLog } from '../src/models/audit-log.js';
import { Restaurant } from '../src/models/restaurant.js';
import { Suggestion } from '../src/models/suggestion.js';
import type { InfoRequest, Mailer } from '../src/services/mailer.js';
import { verifyReplyToken } from '../src/services/reply-token.js';
import { restaurantData } from './helpers/data.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { signedInCookie } from './helpers/session.js';

const WEB = 'https://hearteats.org';
const SECRET = 'k'.repeat(32);
const write = { Origin: WEB, 'X-Requested-With': 'fetch' };

let sent: InfoRequest[];
let failMail = false;
const mailer: Mailer = {
  async sendLoginLink() {},
  async sendInfoRequest(info) {
    if (failMail) throw new Error('Resend respondió 500');
    sent.push(info);
  },
  async sendApproval() {},
};
const app = createApp(
  { CORS_ORIGINS: [WEB], WEB_URL: WEB, REPLY_TOKEN_SECRET: SECRET },
  { mailer },
);

const decide = (id: unknown, body: unknown, cookie?: string) => {
  const req = request(app)
    .post(`/api/v1/suggestions/${String(id)}/decision`)
    .set(write);
  return (cookie ? req.set('Cookie', cookie) : req).send(body as object);
};

const proposal = (over: Record<string, unknown> = {}) =>
  Suggestion.create({
    type: 'new',
    payload: {
      name: 'Casa Nueva',
      street: 'Calle Mayor 5',
      city: 'Madrid',
      foodTags: ['tapas'],
      dishes: [{ name: 'Tortilla' }],
    },
    cityKey: 'madrid',
    contactEmail: 'ana@example.org',
    evidence: ['https://example.org/a'],
    locale: 'es',
    ...over,
  });

let restaurantId: Types.ObjectId;
const stored = (id: unknown) => Suggestion.findById(id).lean();

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  sent = [];
  failMail = false;
  await clearTestDb();
  restaurantId = (await Restaurant.create(restaurantData()))._id;
});

describe('acceso', () => {
  it('sin sesión, 401', async () => {
    const s = await proposal();
    const res = await decide(s._id, { action: 'reject', reason: 'other' });
    expect(res.status).toBe(401);
  });

  it('sin el Origin de la web, 403', async () => {
    const s = await proposal();
    const cookie = await signedInCookie();
    const res = await request(app)
      .post(`/api/v1/suggestions/${s._id}/decision`)
      .set('Cookie', cookie)
      .send({ action: 'reject', reason: 'other' });
    expect(res.status).toBe(403);
    expect((await stored(s._id))?.status).toBe('pending');
  });

  it('un id que no existe, que no es válido o está fuera del ámbito, 404', async () => {
    const cookie = await signedInCookie();
    const other = await proposal({
      payload: {
        name: 'París',
        city: 'Paris',
        foodTags: ['crepes'],
        dishes: [],
      },
      cityKey: 'paris',
    });
    const body = { action: 'reject', reason: 'other' };
    expect((await decide(new Types.ObjectId(), body, cookie)).status).toBe(404);
    expect((await decide('no-es-un-id', body, cookie)).status).toBe(404);
    expect((await decide(other._id, body, cookie)).status).toBe(404);
    expect((await stored(other._id))?.status).toBe('pending');
  });

  it('equipo y retirada: un moderador recibe 403 y un admin puede decidir', async () => {
    const moderator = await signedInCookie();
    const admin = await signedInCookie({
      email: 'root@example.org',
      role: 'admin',
    });
    const body = { action: 'reject', reason: 'other' };
    for (const type of ['team', 'removal'] as const) {
      const s = await proposal({
        type,
        targetRestaurantId: restaurantId,
        payload: { what: 'story' },
      });
      const denied = await decide(s._id, body, moderator);
      expect(denied.status).toBe(403);
      expect(denied.body.error.code).toBe('forbidden');
      expect((await stored(s._id))?.status).toBe('pending');
      expect(await AuditLog.countDocuments({ entityId: s._id })).toBe(0);

      expect((await decide(s._id, body, admin)).status).toBe(200);
      expect((await stored(s._id))?.status).toBe('rejected');
    }
  });

  it('una corrección sí la decide un moderador', async () => {
    const s = await proposal({
      type: 'edit',
      targetRestaurantId: restaurantId,
      payload: { kind: 'hours', details: 'Cierra los lunes' },
    });
    const cookie = await signedInCookie();
    const res = await decide(
      s._id,
      { action: 'reject', reason: 'other' },
      cookie,
    );
    expect(res.status).toBe(200);
  });
});

describe('rechazar', () => {
  it('rechaza, guarda el motivo y deja una línea en la auditoría', async () => {
    const s = await proposal();
    const cookie = await signedInCookie();
    const res = await decide(
      s._id,
      { action: 'reject', reason: 'duplicate', note: ' Ya está en el mapa ' },
      cookie,
    );

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toMatchObject({ id: String(s._id), status: 'rejected' });

    const doc = await stored(s._id);
    expect(doc?.resolution).toMatchObject({
      reason: 'duplicate',
      note: 'Ya está en el mapa',
    });
    const log = await AuditLog.find({ entityId: s._id }).lean();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      entity: 'suggestion',
      action: 'reject',
      diff: {
        status: { from: 'pending', to: 'rejected' },
        reason: 'duplicate',
      },
    });
    expect(String(log[0]!.actorId)).toBe(String(doc?.resolution?.decidedBy));
  });

  it('borra el correo de quien envió y no lo devuelve', async () => {
    const s = await proposal();
    const cookie = await signedInCookie();
    const res = await decide(
      s._id,
      { action: 'reject', reason: 'no_evidence' },
      cookie,
    );

    expect((await stored(s._id))?.contactEmail).toBeUndefined();
    expect(res.body.contactMasked).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('ana@');
  });

  it('el correo tampoco queda en la auditoría', async () => {
    const s = await proposal();
    const cookie = await signedInCookie();
    await decide(s._id, { action: 'reject', reason: 'other' }, cookie);
    expect(JSON.stringify(await AuditLog.find().lean())).not.toContain('ana@');
  });

  it('sin correo también se puede rechazar', async () => {
    const s = await proposal({ contactEmail: undefined });
    const cookie = await signedInCookie();
    const res = await decide(
      s._id,
      { action: 'reject', reason: 'other' },
      cookie,
    );
    expect(res.status).toBe(200);
  });

  it('cierra también una solicitud con información pedida e invalida su enlace', async () => {
    const s = await proposal();
    const cookie = await signedInCookie();
    await decide(s._id, { action: 'ask_info', note: '¿Dónde está?' }, cookie);
    expect((await stored(s._id))?.infoRequest?.nonce).toBeTruthy();

    const res = await decide(
      s._id,
      { action: 'reject', reason: 'other' },
      cookie,
    );
    expect(res.status).toBe(200);
    const doc = await stored(s._id);
    expect(doc?.status).toBe('rejected');
    expect(doc?.infoRequest?.nonce).toBeUndefined();
    expect(doc?.infoRequest?.note).toBe('¿Dónde está?');
    expect(doc?.contactEmail).toBeUndefined();
  });

  it('una solicitud ya resuelta no admite otra decisión', async () => {
    const s = await proposal();
    const cookie = await signedInCookie();
    await decide(s._id, { action: 'reject', reason: 'other' }, cookie);
    for (const body of [
      { action: 'reject', reason: 'duplicate' },
      { action: 'ask_info', note: 'Otra cosa' },
    ]) {
      const res = await decide(s._id, body, cookie);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('already_resolved');
    }
    expect(await AuditLog.countDocuments({ entityId: s._id })).toBe(1);
  });

  it.each([
    ['sin motivo', { action: 'reject' }],
    ['motivo desconocido', { action: 'reject', reason: 'porque_si' }],
    ['nota vacía', { action: 'reject', reason: 'other', note: '  ' }],
    [
      'nota enorme',
      { action: 'reject', reason: 'other', note: 'x'.repeat(1001) },
    ],
    ['acción desconocida', { action: 'borrar' }],
    ['sin cuerpo', {}],
  ])('%s: 422 y no cambia nada', async (_name, body) => {
    const s = await proposal();
    const cookie = await signedInCookie();
    const res = await decide(s._id, body, cookie);
    expect(res.status).toBe(422);
    expect((await stored(s._id))?.status).toBe('pending');
    expect((await stored(s._id))?.contactEmail).toBe('ana@example.org');
  });
});

describe('pedir información', () => {
  it('pasa a «Info pedida» con 30 días y envía el enlace firmado, que vale unos días más', async () => {
    const s = await proposal({ locale: 'en' });
    const cookie = await signedInCookie();
    const before = Date.now();
    const res = await decide(
      s._id,
      { action: 'ask_info', note: '  ¿Tiene web propia? ' },
      cookie,
    );

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'info_requested',
      contactMasked: 'a***@example.org',
    });

    const doc = await stored(s._id);
    const info = doc!.infoRequest!;
    expect(info.note).toBe('¿Tiene web propia?');
    const days =
      (info.deadline.getTime() - info.requestedAt.getTime()) / 86_400_000;
    expect(days).toBe(30);
    expect(info.requestedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(doc?.contactEmail).toBe('ana@example.org'); // sigue hasta resolver

    expect(sent).toHaveLength(1);
    const mail = sent[0]!;
    expect(mail).toMatchObject({
      to: 'ana@example.org',
      locale: 'en',
      note: '¿Tiene web propia?',
    });
    expect(mail.url.startsWith(`${WEB}/en/reply#token=`)).toBe(true);

    const claims = verifyReplyToken(SECRET, mail.url.split('#token=')[1]!);
    expect(claims).toEqual({
      suggestionId: String(s._id),
      // El enlace vale 3 días más que el plazo que dice el correo.
      expiresAt: new Date(
        Math.floor((info.deadline.getTime() + 3 * 86_400_000) / 1000) * 1000,
      ),
      nonce: info.nonce,
    });
  });

  it('deja una línea en la auditoría, sin el correo', async () => {
    const s = await proposal();
    const cookie = await signedInCookie();
    await decide(s._id, { action: 'ask_info', note: '¿Dónde?' }, cookie);
    const log = await AuditLog.find({ entityId: s._id }).lean();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      action: 'ask_info',
      diff: { status: { from: 'pending', to: 'info_requested' } },
    });
    expect(JSON.stringify(log)).not.toContain('ana@');
  });

  it('sin correo, 409 no_contact y nada cambia', async () => {
    const s = await proposal({ contactEmail: undefined });
    const cookie = await signedInCookie();
    const res = await decide(
      s._id,
      { action: 'ask_info', note: '¿Dónde?' },
      cookie,
    );
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('no_contact');
    expect((await stored(s._id))?.status).toBe('pending');
    expect(sent).toHaveLength(0);
    expect(await AuditLog.countDocuments()).toBe(0);
  });

  it('exige la nota', async () => {
    const s = await proposal();
    const cookie = await signedInCookie();
    expect((await decide(s._id, { action: 'ask_info' }, cookie)).status).toBe(
      422,
    );
    expect(
      (await decide(s._id, { action: 'ask_info', note: '' }, cookie)).status,
    ).toBe(422);
    expect(sent).toHaveLength(0);
  });

  it('no se pide dos veces', async () => {
    const s = await proposal();
    const cookie = await signedInCookie();
    await decide(s._id, { action: 'ask_info', note: 'Uno' }, cookie);
    const res = await decide(
      s._id,
      { action: 'ask_info', note: 'Dos' },
      cookie,
    );
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('info_already_requested');
    expect(sent).toHaveLength(1);
  });

  it('si el correo falla, 502 y la solicitud vuelve a «Pendiente»', async () => {
    const s = await proposal();
    const cookie = await signedInCookie();
    failMail = true;
    const res = await decide(
      s._id,
      { action: 'ask_info', note: '¿Dónde?' },
      cookie,
    );
    expect(res.status).toBe(502);
    expect(JSON.stringify(res.body)).not.toContain('ana@');
    const doc = await stored(s._id);
    expect(doc?.status).toBe('pending');
    expect(doc?.infoRequest).toBeUndefined();
    expect(await AuditLog.countDocuments()).toBe(0);

    failMail = false;
    const retry = await decide(
      s._id,
      { action: 'ask_info', note: '¿Dónde?' },
      cookie,
    );
    expect(retry.status).toBe(200);
  });

  it('la cola la lista en «Info pedida»', async () => {
    const s = await proposal();
    const cookie = await signedInCookie();
    await decide(s._id, { action: 'ask_info', note: '¿Dónde?' }, cookie);
    const res = await request(app)
      .get('/api/v1/suggestions?status=info_requested')
      .set('Cookie', cookie);
    expect(res.body.items.map((i: { id: string }) => i.id)).toEqual([
      String(s._id),
    ]);
  });
});

describe('aprobar', () => {
  it('solo un local nuevo: lo demás da 501 y no cambia nada', async () => {
    const s = await proposal({
      type: 'edit',
      targetRestaurantId: restaurantId,
      payload: { kind: 'address', details: 'Calle Nueva 1' },
    });
    const cookie = await signedInCookie();
    const res = await decide(s._id, { action: 'approve' }, cookie);
    expect(res.status).toBe(501);
    expect((await stored(s._id))?.status).toBe('pending');
    expect(await AuditLog.countDocuments()).toBe(0);
  });
});
