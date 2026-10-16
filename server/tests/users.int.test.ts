import { Types } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { AuditLog } from '../src/models/audit-log.js';
import { LoginToken } from '../src/models/login-token.js';
import { Session } from '../src/models/session.js';
import { User } from '../src/models/user.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { signedInCookie } from './helpers/session.js';

const ORIGIN = 'https://hearteats.org';
const app = createApp({ CORS_ORIGINS: [ORIGIN] });
const send = (
  method: 'get' | 'post' | 'delete',
  path: string,
  cookie?: string,
  body?: object,
) => {
  let req = request(app)[method](`/api/v1${path}`);
  if (cookie) req = req.set('Cookie', cookie);
  if (method !== 'get') {
    req = req.set('Origin', ORIGIN).set('X-Requested-With', 'heart-eats');
  }
  return body ? req.send(body) : req;
};
const admin = () => signedInCookie({ role: 'admin' });
const invite = {
  email: 'Nueva@Example.org',
  moderationScope: [{ country: 'es', city: 'Madrid' }],
};

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

describe('acceso', () => {
  it('sin sesión, 401 en las tres rutas', async () => {
    const id = new Types.ObjectId().toString();
    expect((await send('get', '/users')).status).toBe(401);
    expect((await send('post', '/users', undefined, invite)).status).toBe(401);
    expect((await send('delete', `/users/${id}`)).status).toBe(401);
  });

  it('un moderador, 403 en las tres rutas', async () => {
    const cookie = await signedInCookie();
    const id = new Types.ObjectId().toString();
    for (const res of [
      await send('get', '/users', cookie),
      await send('post', '/users', cookie, invite),
      await send('delete', `/users/${id}`, cookie),
    ]) {
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('forbidden');
    }
    expect(await User.countDocuments({ email: 'nueva@example.org' })).toBe(0);
  });

  it('las escrituras exigen el origen de la web', async () => {
    const cookie = await admin();
    const res = await request(app)
      .post('/api/v1/users')
      .set('Cookie', cookie)
      .send(invite);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/v1/users', () => {
  it('lista moderadores y administradores, con las bajas, sin caché', async () => {
    const cookie = await admin();
    await User.create([
      {
        email: 'baja@example.org',
        role: 'moderator',
        moderationScope: [{ country: 'ES' }],
        disabledAt: new Date('2026-10-02T00:00:00Z'),
      },
      { email: 'comunidad@example.org', role: 'community' },
    ]);
    const res = await send('get', '/users', cookie);
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    const items = res.body.items as { email: string }[];
    expect(items.map((u) => u.email).sort()).toEqual([
      'ana@example.org',
      'baja@example.org',
    ]);
    expect(items.find((u) => u.email === 'baja@example.org')).toMatchObject({
      role: 'moderator',
      moderationScope: [{ country: 'ES' }],
      disabledAt: '2026-10-02T00:00:00.000Z',
    });
    expect(res.body.items[0]).not.toHaveProperty('_id');
  });
});

describe('POST /api/v1/users', () => {
  it('da de alta a un moderador, normaliza los datos y deja una línea sin el correo', async () => {
    const cookie = await admin();
    const res = await send('post', '/users', cookie, invite);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      email: 'nueva@example.org',
      role: 'moderator',
      moderationScope: [{ country: 'ES', city: 'Madrid' }],
    });
    expect(res.body).not.toHaveProperty('disabledAt');

    const [line] = await AuditLog.find({ entity: 'user' }).lean();
    expect(line).toMatchObject({
      action: 'invite',
      entityId: new Types.ObjectId(res.body.id),
      diff: {
        role: 'moderator',
        moderationScope: [{ country: 'ES', city: 'Madrid' }],
      },
    });
    expect(line!.actorId).toBeDefined();
    expect(JSON.stringify(line)).not.toContain('nueva@example.org');
  });

  it('la persona invitada puede pedir su enlace y moderar su ámbito', async () => {
    const cookie = await admin();
    await send('post', '/users', cookie, invite);
    const user = await User.findOne({ email: 'nueva@example.org' }).lean();
    expect(user).toMatchObject({ role: 'moderator' });
    const link = await request(app)
      .post('/api/v1/auth/magic-link')
      .send({ email: 'nueva@example.org' });
    expect(link.status).toBe(202);
    expect(await LoginToken.countDocuments({ userId: user!._id })).toBe(1);
  });

  it('409 si esa persona ya tiene acceso, sea moderadora o administradora', async () => {
    const cookie = await admin();
    await User.create({ email: 'mod@example.org', role: 'moderator' });
    for (const email of ['mod@example.org', 'ana@example.org']) {
      const res = await send('post', '/users', cookie, { ...invite, email });
      expect(res.status, email).toBe(409);
      expect(res.body.error.code).toBe('already_exists');
    }
    expect(await AuditLog.countDocuments({ action: 'invite' })).toBe(0);
  });

  it('repone a quien estaba de baja con el ámbito nuevo', async () => {
    const cookie = await admin();
    const old = await User.create({
      email: 'nueva@example.org',
      role: 'moderator',
      moderationScope: [{ country: 'FR' }],
      disabledAt: new Date(),
    });
    const res = await send('post', '/users', cookie, invite);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(String(old._id));
    expect(res.body).not.toHaveProperty('disabledAt');
    expect(res.body.moderationScope).toEqual([
      { country: 'ES', city: 'Madrid' },
    ]);
    const fresh = await User.findById(old._id).lean();
    expect(fresh!.disabledAt).toBeUndefined();
    expect(await AuditLog.countDocuments({ action: 'reinstate' })).toBe(1);
  });

  it('un administrador de baja no se repone por aquí', async () => {
    const cookie = await admin();
    await User.create({
      email: 'otro@example.org',
      role: 'admin',
      disabledAt: new Date(),
    });
    const res = await send('post', '/users', cookie, {
      ...invite,
      email: 'otro@example.org',
    });
    expect(res.status).toBe(409);
  });

  it('el rol que se envíe se ignora: siempre es moderador', async () => {
    const cookie = await admin();
    const res = await send('post', '/users', cookie, {
      ...invite,
      role: 'admin',
    });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('moderator');
  });

  it.each([
    ['sin correo', { moderationScope: invite.moderationScope }],
    ['correo roto', { ...invite, email: 'no-es-correo' }],
    ['sin ámbito', { email: invite.email }],
    ['ámbito vacío', { ...invite, moderationScope: [] }],
    [
      'país de tres letras',
      { ...invite, moderationScope: [{ country: 'ESP' }] },
    ],
    [
      'demasiados ámbitos',
      {
        ...invite,
        moderationScope: Array.from({ length: 11 }, () => ({ country: 'ES' })),
      },
    ],
  ])('422 %s', async (_name, body) => {
    const res = await send('post', '/users', await admin(), body);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('validation_failed');
  });
});

describe('DELETE /api/v1/users/:id', () => {
  const moderator = () =>
    User.create({
      email: 'mod@example.org',
      role: 'moderator',
      moderationScope: [{ country: 'ES' }],
    });

  it('da de baja, cierra sesiones y enlaces y lo deja en el registro', async () => {
    const cookie = await admin();
    const mod = await moderator();
    await Session.create({ userId: mod._id, tokenHash: 'a'.repeat(64) });
    await LoginToken.create({
      userId: mod._id,
      tokenHash: 'b'.repeat(64),
      expiresAt: new Date(Date.now() + 60_000),
    });

    const res = await send('delete', `/users/${mod._id}`, cookie);
    expect(res.status).toBe(204);
    expect((await User.findById(mod._id).lean())!.disabledAt).toBeInstanceOf(
      Date,
    );
    expect(await Session.countDocuments({ userId: mod._id })).toBe(0);
    expect(await LoginToken.countDocuments({ userId: mod._id })).toBe(0);
    expect(await AuditLog.countDocuments({ action: 'disable' })).toBe(1);

    const list = await send('get', '/users', cookie);
    expect(
      list.body.items.find((u: { id: string }) => u.id === String(mod._id)),
    ).toHaveProperty('disabledAt');
  });

  it('una persona de baja ya no entra ni con la sesión que tenía', async () => {
    const cookie = await admin();
    const modCookie = await signedInCookie({ email: 'mod@example.org' });
    const mod = await User.findOne({ email: 'mod@example.org' });
    expect(
      (await request(app).get('/api/v1/auth/me').set('Cookie', modCookie))
        .status,
    ).toBe(200);
    await send('delete', `/users/${mod!._id}`, cookie);
    expect(
      (await request(app).get('/api/v1/auth/me').set('Cookie', modCookie))
        .status,
    ).toBe(401);
  });

  it('es idempotente: repetirlo sale bien y no añade otra línea', async () => {
    const cookie = await admin();
    const mod = await moderator();
    expect((await send('delete', `/users/${mod._id}`, cookie)).status).toBe(
      204,
    );
    expect((await send('delete', `/users/${mod._id}`, cookie)).status).toBe(
      204,
    );
    expect(await AuditLog.countDocuments({ action: 'disable' })).toBe(1);
  });

  it('no se da de baja a un administrador', async () => {
    const cookie = await admin();
    const other = await User.create({
      email: 'otro@example.org',
      role: 'admin',
    });
    const res = await send('delete', `/users/${other._id}`, cookie);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('cannot_remove_admin');
    expect((await User.findById(other._id).lean())!.disabledAt).toBeUndefined();
  });

  it('404 si no existe, el id no es válido o es de la comunidad', async () => {
    const cookie = await admin();
    const community = await User.create({
      email: 'c@example.org',
      role: 'community',
    });
    for (const id of [
      new Types.ObjectId().toString(),
      'no-es-id',
      community._id,
    ]) {
      const res = await send('delete', `/users/${id}`, cookie);
      expect(res.status, String(id)).toBe(404);
    }
  });
});
