// Valida los modelos y los datos semilla sin base de datos: Mongoose valida
// documentos en memoria (`validate()` no necesita conexión).
import { readFileSync } from 'node:fs';
import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { Restaurant } from '../src/models/restaurant.js';
import { Team } from '../src/models/team.js';
import { restaurantData } from './helpers/data.js';

const valid = (data: unknown) => new Restaurant(data).validate();

describe('Restaurant', () => {
  it('acepta un local válido y rellena los campos derivados', async () => {
    const doc = new Restaurant(restaurantData());
    await doc.validate();
    expect(doc.get('cityKey')).toBe('madrid');
    expect(doc.get('searchText')).toBe('[demo] uno lavapies madrid 28012');
  });

  it('rechaza lo que la especificación prohíbe', async () => {
    await expect(
      valid(restaurantData({ slug: 'Con Mayúsculas' })),
    ).rejects.toThrow(/slug/);
    await expect(valid(restaurantData({ name: 'x' }))).rejects.toThrow(/name/);
    await expect(valid(restaurantData({ foodTags: [] }))).rejects.toThrow(
      /foodTags/,
    );
    await expect(
      valid(restaurantData({ businessType: 'castle' })),
    ).rejects.toThrow(/businessType/);
    await expect(
      valid(
        restaurantData({ location: { type: 'Point', coordinates: [200, 40] } }),
      ),
    ).rejects.toThrow(/coordinates/);
    await expect(
      valid(
        restaurantData({
          address: { street: 'Calle', city: 'Madrid', country: 'España' },
        }),
      ),
    ).rejects.toThrow(/country/);
    await expect(
      valid(
        restaurantData({ contact: { website: 'http://inseguro.example' } }),
      ),
    ).rejects.toThrow(/website/);
    await expect(
      valid(
        restaurantData({
          signatureDishes: [1, 2, 3, 4].map((n) => ({ name: `Plato ${n}` })),
        }),
      ),
    ).rejects.toThrow(/signatureDishes/);
    await expect(
      valid(
        restaurantData({
          openingHours: [{ day: 7, open: '10:00', close: '20:00' }],
        }),
      ),
    ).rejects.toThrow(/openingHours/);
  });

  it('un local verificado necesita la fecha de verificación', async () => {
    await expect(
      valid(
        restaurantData({ verification: { level: 'admin', method: 'visit' } }),
      ),
    ).rejects.toThrow(/lastVerifiedAt/);
    await expect(
      valid(restaurantData({ verification: { level: 'unverified' } })),
    ).resolves.toBeUndefined();
  });
});

describe('Team', () => {
  const team = (over: Record<string, unknown> = {}) =>
    new Team({
      restaurantId: new Types.ObjectId(),
      summary: { totalStaff: 9, staffWithDisability: 3 },
      ...over,
    }).validate();

  it('acepta un equipo válido', async () => {
    await expect(team()).resolves.toBeUndefined();
  });

  it('no admite más personas con discapacidad que plantilla', async () => {
    await expect(
      team({ summary: { totalStaff: 5, staffWithDisability: 6 } }),
    ).rejects.toThrow(/staffWithDisability/);
  });

  it('no admite una historia sin consentimiento registrado', async () => {
    await expect(
      team({ stories: [{ displayName: 'X', role: 'Y', storyText: 'Z' }] }),
    ).rejects.toThrow(/consent/);
  });

  it('no admite más de 3 historias', async () => {
    const story = {
      displayName: 'X',
      role: 'Y',
      storyText: 'Z',
      consentRecordedAt: new Date(),
      consentBy: 'self',
    };
    await expect(
      team({ stories: [story, story, story, story] }),
    ).rejects.toThrow(/stories/);
  });
});

describe('datos semilla', () => {
  const entries = JSON.parse(
    readFileSync(new URL('../seed/restaurants.json', import.meta.url), 'utf-8'),
  ) as {
    slug: string;
    name: string;
    isDemo?: boolean;
    team?: Record<string, unknown>;
  }[];

  it('hay locales de ejemplo, todos marcados [DEMO]', () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(e.isDemo).toBe(true);
      expect(e.name.startsWith('[DEMO]')).toBe(true);
    }
  });

  it('todos pasan la validación de los modelos', async () => {
    for (const { team, ...data } of entries) {
      await expect(valid(data), data.slug).resolves.toBeUndefined();
      if (team) {
        await expect(
          new Team({ ...team, restaurantId: new Types.ObjectId() }).validate(),
          data.slug,
        ).resolves.toBeUndefined();
      }
    }
  });
});
