import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { AuditLog } from '../src/models/audit-log.js';
import { Restaurant } from '../src/models/restaurant.js';
import { Suggestion } from '../src/models/suggestion.js';
import { Team } from '../src/models/team.js';
import { runMaintenance } from '../src/services/maintenance.js';
import {
  CONTACT_EMAIL_DAYS,
  purgeOldContactEmails,
  purgeRevokedStories,
  REVOKED_STORY_DAYS,
} from '../src/services/retention.js';
import { restaurantData } from './helpers/data.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

const app = createApp({ CORS_ORIGINS: ['https://hearteats.org'] });

const story = (name: string, over: Record<string, unknown> = {}) => ({
  displayName: name,
  role: 'Cocina',
  storyText: `Historia de ${name}`,
  photoUrl: `https://fotos.example/${name}.jpg`,
  consentRecordedAt: daysAgo(100),
  consentBy: 'self',
  ...over,
});

async function teamWith(stories: Record<string, unknown>[]) {
  const restaurant = await Restaurant.create(
    restaurantData({
      ownerConfirmedAt: daysAgo(90),
    }),
  );
  return Team.create({
    restaurantId: restaurant._id,
    visibilityLevel: 'full',
    summary: { totalStaff: 10, staffWithDisability: 4 },
    stories,
  });
}

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

describe('borrado de historias retiradas', () => {
  it('vacía el contenido pasado el plazo y conserva el hueco, el consentimiento y las fechas', async () => {
    const team = await teamWith([
      story('Ana', { revokedAt: daysAgo(REVOKED_STORY_DAYS + 1) }),
      story('Beto'),
    ]);

    expect(await purgeRevokedStories()).toBe(1);

    const raw = await Team.collection.findOne({ _id: team._id });
    const [ana, beto] = raw?.stories as Record<string, unknown>[];
    expect(ana).toMatchObject({ consentBy: 'self' });
    expect(ana?.purgedAt).toBeInstanceOf(Date);
    expect(ana?.revokedAt).toBeInstanceOf(Date);
    expect(ana?.consentRecordedAt).toBeInstanceOf(Date);
    for (const field of ['displayName', 'role', 'storyText', 'photoUrl']) {
      expect(ana).not.toHaveProperty(field);
    }
    expect(JSON.stringify(raw)).not.toContain('Ana');
    expect(beto).toMatchObject({
      displayName: 'Beto',
      storyText: 'Historia de Beto',
    });
    expect(beto).not.toHaveProperty('purgedAt');
  });

  it('no toca las retiradas dentro del plazo ni las vigentes', async () => {
    const team = await teamWith([
      story('Ana', { revokedAt: daysAgo(REVOKED_STORY_DAYS - 1) }),
      story('Beto'),
    ]);
    expect(await purgeRevokedStories()).toBe(0);
    const doc = await Team.findById(team._id).lean();
    expect(doc?.stories?.[0]?.displayName).toBe('Ana');
    expect(await AuditLog.countDocuments()).toBe(0);
  });

  it('es idempotente y audita sin actor ni contenido, solo las posiciones', async () => {
    const team = await teamWith([
      story('Ana', { revokedAt: daysAgo(40) }),
      story('Beto'),
      story('Carla', { revokedAt: daysAgo(30) }),
    ]);
    expect(await purgeRevokedStories()).toBe(2);
    expect(await purgeRevokedStories()).toBe(0);

    const log = await AuditLog.find({ entityId: team._id }).lean();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      entity: 'team',
      action: 'purge_stories',
      diff: { stories: [0, 2] },
    });
    expect(log[0]?.actorId).toBeUndefined();
    expect(JSON.stringify(log)).not.toMatch(/Ana|Carla|Historia/);
  });

  it('la ficha pública sigue sirviendo solo las vigentes y se puede volver a guardar el equipo', async () => {
    const team = await teamWith([
      story('Ana', { revokedAt: daysAgo(40) }),
      story('Beto'),
    ]);
    await purgeRevokedStories();

    const res = await request(app).get('/api/v1/restaurants/demo-uno');
    expect(res.status).toBe(200);
    expect(res.body.team.stories).toEqual([
      expect.objectContaining({ displayName: 'Beto' }),
    ]);

    const doc = await Team.findById(team._id);
    if (!doc) throw new Error('equipo no encontrado');
    doc.set('summary.totalStaff', 12);
    await expect(doc.save()).resolves.toBeDefined();
  });

  it('una historia vigente sin contenido no pasa la validación', async () => {
    await expect(
      teamWith([story('Ana', { storyText: undefined })]),
    ).rejects.toThrow(/contenido/);
  });
});

describe('tope del correo guardado', () => {
  const pending = (age: number, over: Record<string, unknown> = {}) =>
    Suggestion.collection.insertOne({
      type: 'new',
      status: 'pending',
      payload: { name: 'Casa' },
      evidence: [],
      warnings: [],
      replies: [],
      locale: 'es',
      contactEmail: 'ana@example.com',
      createdAt: daysAgo(age),
      ...over,
    });

  it('borra el correo pasado el tope, sea cual sea el estado, y deja la solicitud', async () => {
    const a = await pending(CONTACT_EMAIL_DAYS + 1);
    const b = await pending(CONTACT_EMAIL_DAYS + 5, {
      status: 'info_requested',
    });
    const fresh = await pending(CONTACT_EMAIL_DAYS - 1);

    expect(await purgeOldContactEmails()).toBe(2);

    const stored = (id: unknown) =>
      Suggestion.collection.findOne({ _id: id as never });
    expect(await stored(a.insertedId)).toMatchObject({ status: 'pending' });
    expect(await stored(a.insertedId)).not.toHaveProperty('contactEmail');
    expect(await stored(b.insertedId)).not.toHaveProperty('contactEmail');
    expect(await stored(fresh.insertedId)).toHaveProperty(
      'contactEmail',
      'ana@example.com',
    );
  });

  it('es idempotente y audita sin actor ni correo', async () => {
    const a = await pending(CONTACT_EMAIL_DAYS + 1);
    await Suggestion.collection.insertOne({
      type: 'new',
      status: 'pending',
      payload: {},
      evidence: [],
      warnings: [],
      replies: [],
      locale: 'es',
      createdAt: daysAgo(CONTACT_EMAIL_DAYS + 1),
    });
    expect(await purgeOldContactEmails()).toBe(1);
    expect(await purgeOldContactEmails()).toBe(0);

    const log = await AuditLog.find().lean();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      entity: 'suggestion',
      entityId: a.insertedId,
      action: 'purge_email',
    });
    expect(log[0]?.actorId).toBeUndefined();
    expect(JSON.stringify(log)).not.toContain('ana@');
  });
});

describe('pasada de mantenimiento', () => {
  it('ejecuta todas las tareas', async () => {
    await teamWith([story('Ana', { revokedAt: daysAgo(40) })]);
    await Suggestion.collection.insertOne({
      type: 'new',
      status: 'pending',
      payload: {},
      evidence: [],
      warnings: [],
      replies: [],
      locale: 'es',
      contactEmail: 'ana@example.com',
      createdAt: daysAgo(CONTACT_EMAIL_DAYS + 1),
    });
    await runMaintenance();
    expect(await AuditLog.find().distinct('action')).toEqual(
      expect.arrayContaining(['purge_stories', 'purge_email']),
    );
  });
});
