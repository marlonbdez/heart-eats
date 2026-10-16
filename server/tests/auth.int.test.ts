import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { AuditLog } from '../src/models/audit-log.js';
import { LoginToken } from '../src/models/login-token.js';
import { Session } from '../src/models/session.js';
import { User } from '../src/models/user.js';
import { ensureAdmin } from '../src/services/ensure-admin.js';
import type { LoginLink, Mailer } from '../src/services/mailer.js';
import { hashToken } from '../src/services/tokens.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';

const WEB = 'https://hearteats.org';
const write = { Origin: WEB, 'X-Requested-With': 'fetch' };

let app: ReturnType<typeof createApp>;
let sent: LoginLink[];

const mailer: Mailer = {
  async sendLoginLink(link) {
    sent.push(link);
  },
  async sendInfoRequest() {},
};
const tokenOf = (link: LoginLink) => link.url.split('#token=')[1]!;
const requestLink = (email = 'ana@example.org') =>
  request(app).post('/api/v1/auth/magic-link').send({ email });
const openSession = (token: string) =>
  request(app).post('/api/v1/auth/session').send({ token });
// Cabecera Cookie a partir de la respuesta de /auth/session.
const cookieOf = (res: request.Response) =>
  (res.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;

async function signIn() {
  await requestLink();
  const res = await openSession(tokenOf(sent[0]!));
  return cookieOf(res);
}

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  sent = [];
  app = createApp(
    { CORS_ORIGINS: [WEB], WEB_URL: WEB, NODE_ENV: 'production' },
    { mailer },
  );
  await clearTestDb();
  await User.create({
    email: 'ana@example.org',
    role: 'moderator',
    moderationScope: [{ country: 'ES', city: 'Madrid' }],
  });
});

describe('POST /api/v1/auth/magic-link', () => {
  it('envía el enlace al usuario de alta, con el token en el fragmento', async () => {
    const res = await requestLink('Ana@Example.org');
    expect(res.status).toBe(202);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: 'ana@example.org', locale: 'es' });
    expect(sent[0]!.url).toMatch(
      new RegExp(`^${WEB}/es/moderation/login#token=[\\w-]{43}$`),
    );
  });

  it('responde igual y no envía nada si el correo no es de nadie', async () => {
    const res = await requestLink('nadie@example.org');
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ status: 'accepted' });
    expect(sent).toHaveLength(0);
    expect(await LoginToken.countDocuments()).toBe(0);
  });

  it('no envía a quien ya no puede moderar', async () => {
    await User.updateOne({}, { disabledAt: new Date() });
    await requestLink();
    await User.updateOne({}, { $unset: { disabledAt: '' }, role: 'community' });
    await requestLink();
    expect(sent).toHaveLength(0);
  });

  it('solo guarda el hash del token', async () => {
    await requestLink();
    const stored = await LoginToken.findOne().lean();
    expect(stored?.tokenHash).toBe(hashToken(tokenOf(sent[0]!)));
    expect(JSON.stringify(stored)).not.toContain(tokenOf(sent[0]!));
  });

  it('limita los enlaces vivos por persona', async () => {
    for (let i = 0; i < 8; i++) await requestLink();
    expect(sent).toHaveLength(5);
  });

  it('rechaza con 422 un correo inválido', async () => {
    const res = await requestLink('mal');
    expect(res.status).toBe(422);
  });

  it('corta con 429 al pasar el tope por IP', async () => {
    for (let i = 0; i < 20; i++) await requestLink('nadie@example.org');
    const res = await requestLink('nadie@example.org');
    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBeDefined();
  });
});

describe('POST /api/v1/auth/session', () => {
  it('crea la sesión, fija la cookie y deja constancia en la auditoría', async () => {
    await requestLink();
    const res = await openSession(tokenOf(sent[0]!));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      email: 'ana@example.org',
      role: 'moderator',
      moderationScope: [{ country: 'ES', city: 'Madrid' }],
    });

    const cookie = (res.headers['set-cookie'] as unknown as string[])[0]!;
    expect(cookie).toMatch(/^he_session=[\w-]{43};/);
    for (const part of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/']) {
      expect(cookie).toContain(part);
    }

    const user = await User.findOne().lean();
    expect(await Session.countDocuments()).toBe(1);
    expect(await AuditLog.findOne().lean()).toMatchObject({
      entity: 'user',
      entityId: user!._id,
      action: 'login',
      actorId: user!._id,
    });
  });

  it('el token solo sirve una vez', async () => {
    await requestLink();
    const token = tokenOf(sent[0]!);
    expect((await openSession(token)).status).toBe(200);
    const again = await openSession(token);
    expect(again.status).toBe(401);
    expect(again.body.error.code).toBe('invalid_token');
    expect(await Session.countDocuments()).toBe(1);
  });

  it('rechaza un token caducado o desconocido', async () => {
    await requestLink();
    await LoginToken.updateOne({}, { expiresAt: new Date(Date.now() - 1000) });
    expect((await openSession(tokenOf(sent[0]!))).status).toBe(401);
    expect((await openSession('a'.repeat(43))).status).toBe(401);
    expect((await openSession('corto')).status).toBe(422);
  });

  it('no abre sesión si el usuario causó baja tras pedir el enlace', async () => {
    await requestLink();
    await User.updateOne({}, { disabledAt: new Date() });
    const res = await openSession(tokenOf(sent[0]!));
    expect(res.status).toBe(401);
    expect(res.headers['set-cookie']).toBeUndefined();
  });
});

describe('GET /api/v1/auth/me', () => {
  it('devuelve el usuario con la cookie de la sesión', async () => {
    const cookie = await signIn();
    const res = await request(app).get('/api/v1/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('ana@example.org');
    expect(res.body).not.toHaveProperty('id');
  });

  it('responde 401 sin cookie o con una cookie falsa', async () => {
    const none = await request(app).get('/api/v1/auth/me');
    expect(none.status).toBe(401);
    expect(none.body.error.code).toBe('unauthorized');
    const fake = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', `he_session=${'a'.repeat(43)}`);
    expect(fake.status).toBe(401);
  });

  it('una baja corta el acceso al momento', async () => {
    const cookie = await signIn();
    await User.updateOne({}, { disabledAt: new Date() });
    const res = await request(app).get('/api/v1/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(401);
  });

  it('una sesión sin actividad en 7 días ya no vale', async () => {
    const cookie = await signIn();
    await Session.updateOne(
      {},
      { lastSeenAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
    );
    const res = await request(app).get('/api/v1/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(401);
  });

  it('cada uso renueva la actividad', async () => {
    const cookie = await signIn();
    const old = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    await Session.updateOne({}, { lastSeenAt: old });
    await request(app).get('/api/v1/auth/me').set('Cookie', cookie);
    const session = await Session.findOne().lean();
    expect(session!.lastSeenAt.getTime()).toBeGreaterThan(old.getTime());
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('borra la sesión y la cookie', async () => {
    const cookie = await signIn();
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set({ ...write, Cookie: cookie });
    expect(res.status).toBe(204);
    expect(await Session.countDocuments()).toBe(0);
    expect((res.headers['set-cookie'] as unknown as string[])[0]).toMatch(
      /^he_session=;/,
    );
    const me = await request(app).get('/api/v1/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(401);
  });

  it('exige el origen de la web y la cabecera propia', async () => {
    const cookie = await signIn();
    for (const headers of [
      {},
      { Origin: WEB },
      { 'X-Requested-With': 'fetch' },
      { Origin: 'https://otro.example', 'X-Requested-With': 'fetch' },
    ]) {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set({ ...headers, Cookie: cookie });
      expect(res.status).toBe(403);
    }
    expect(await Session.countDocuments()).toBe(1);
  });

  it('sin sesión también sale bien', async () => {
    const res = await request(app).post('/api/v1/auth/logout').set(write);
    expect(res.status).toBe(204);
  });
});

describe('ensureAdmin', () => {
  it('da de alta al administrador una sola vez y lo repone si estaba de baja', async () => {
    await ensureAdmin('admin@example.org');
    await ensureAdmin('admin@example.org');
    expect(await User.countDocuments({ email: 'admin@example.org' })).toBe(1);

    await User.updateOne(
      { email: 'admin@example.org' },
      {
        disabledAt: new Date(),
        moderationScope: [{ country: 'FR' }],
      },
    );
    await ensureAdmin('admin@example.org');
    const admin = await User.findOne({ email: 'admin@example.org' }).lean();
    expect(admin).toMatchObject({
      role: 'admin',
      moderationScope: [{ country: 'FR' }],
    });
    expect(admin).not.toHaveProperty('disabledAt');
  });

  it('el administrador nuevo puede entrar por enlace', async () => {
    await ensureAdmin('admin@example.org');
    await requestLink('admin@example.org');
    expect(sent).toHaveLength(1);
    const res = await openSession(tokenOf(sent[0]!));
    expect(res.body).toMatchObject({
      role: 'admin',
      moderationScope: [{ country: 'ES', city: 'Madrid' }],
    });
  });
});
