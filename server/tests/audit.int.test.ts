import { Types } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { AuditLog } from '../src/models/audit-log.js';
import { User } from '../src/models/user.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { signedInCookie } from './helpers/session.js';

const app = createApp({ CORS_ORIGINS: ['https://hearteats.org'] });
const get = (query = '', cookie?: string) => {
  const req = request(app).get(`/api/v1/audit${query}`);
  return cookie ? req.set('Cookie', cookie) : req;
};
const admin = () => signedInCookie({ role: 'admin' });

const line = ({
  at = '2026-10-01T10:00:00Z',
  ...over
}: Partial<{
  entity: 'restaurant' | 'team' | 'suggestion' | 'user';
  entityId: Types.ObjectId;
  action: string;
  actorId: Types.ObjectId;
  diff: Record<string, unknown>;
  at: string;
}> = {}) => ({
  entity: 'suggestion' as const,
  entityId: new Types.ObjectId(),
  action: 'approve',
  ...over,
  at: new Date(at),
});

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

describe('acceso', () => {
  it('sin sesión, 401', async () => {
    expect((await get()).status).toBe(401);
  });

  it('un moderador, 403', async () => {
    const res = await get('', await signedInCookie());
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('forbidden');
  });

  it('un administrador, 200', async () => {
    expect((await get('', await admin())).status).toBe(200);
  });
});

describe('GET /api/v1/audit', () => {
  it('lista de lo más reciente a lo más antiguo, sin guardar en caché', async () => {
    await AuditLog.create([
      line({ action: 'old', at: '2026-10-01T10:00:00Z' }),
      line({ action: 'new', at: '2026-10-03T10:00:00Z' }),
      line({ action: 'mid', at: '2026-10-02T10:00:00Z' }),
    ]);
    const res = await get('', await admin());

    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.items.map((i: { action: string }) => i.action)).toEqual([
      'new',
      'mid',
      'old',
    ]);
    expect(res.body.nextCursor).toBeUndefined();
  });

  it('cada línea lleva qué, sobre qué, cuándo, quién y el cambio', async () => {
    const actor = await User.create({
      email: 'actor@example.org',
      role: 'moderator',
      moderationScope: [{ country: 'ES' }],
    });
    const entityId = new Types.ObjectId();
    await AuditLog.create(
      line({
        entity: 'restaurant',
        entityId,
        action: 'update',
        actorId: actor._id,
        diff: { name: { from: 'Casa', to: 'Casa Nueva' } },
        at: '2026-10-02T10:00:00Z',
      }),
    );
    const res = await get('', await admin());

    expect(res.body.items[0]).toMatchObject({
      entity: 'restaurant',
      entityId: String(entityId),
      action: 'update',
      at: '2026-10-02T10:00:00.000Z',
      actorId: String(actor._id),
      actor: 'actor@example.org',
      diff: { name: { from: 'Casa', to: 'Casa Nueva' } },
    });
  });

  it('una línea del sistema no lleva quién; si quien actuó ya no existe, solo su id', async () => {
    const gone = new Types.ObjectId();
    await AuditLog.create([
      line({ action: 'auto_close', at: '2026-10-02T10:00:00Z' }),
      line({ action: 'reject', actorId: gone, at: '2026-10-01T10:00:00Z' }),
    ]);
    const [system, orphan] = (await get('', await admin())).body.items;

    expect(system).not.toHaveProperty('actorId');
    expect(system).not.toHaveProperty('actor');
    expect(orphan.actorId).toBe(String(gone));
    expect(orphan).not.toHaveProperty('actor');
  });

  it('filtra por entidad y por id', async () => {
    const target = new Types.ObjectId();
    await AuditLog.create([
      line({ entity: 'team', entityId: target, action: 'create' }),
      line({ entity: 'team', action: 'create' }),
      line({ entity: 'restaurant', entityId: target, action: 'archive' }),
    ]);
    const cookie = await admin();

    const byEntity = await get('?entity=team', cookie);
    expect(byEntity.body.items).toHaveLength(2);

    const byBoth = await get(`?entity=team&entityId=${target}`, cookie);
    expect(byBoth.body.items).toHaveLength(1);
    expect(byBoth.body.items[0].action).toBe('create');

    const byId = await get(`?entityId=${target}`, cookie);
    expect(byId.body.items).toHaveLength(2);
  });

  it('pagina con cursor sin repetir ni saltarse líneas, aunque compartan fecha', async () => {
    await AuditLog.create(
      Array.from({ length: 5 }, (_, i) =>
        line({
          action: `a${i}`,
          at: i < 3 ? '2026-10-01T10:00:00Z' : '2026-10-02T10:00:00Z',
        }),
      ),
    );
    const cookie = await admin();
    const seen: string[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 5; page++) {
      const res = await get(
        `?limit=2${cursor ? `&cursor=${cursor}` : ''}`,
        cookie,
      );
      expect(res.status).toBe(200);
      seen.push(...res.body.items.map((i: { action: string }) => i.action));
      cursor = res.body.nextCursor;
      if (!cursor) break;
    }
    expect([...seen].sort()).toEqual(['a0', 'a1', 'a2', 'a3', 'a4']);
    expect(new Set(seen).size).toBe(5);
  });

  it('valida la consulta: entidad, id, límite y cursor', async () => {
    const cookie = await admin();
    for (const query of [
      '?entity=otra',
      '?entityId=no-es-id',
      '?limit=0',
      '?limit=201',
      '?cursor=basura',
    ]) {
      const res = await get(query, cookie);
      expect(res.status, query).toBe(422);
      expect(res.body.error.code).toBe('validation_failed');
    }
  });
});
