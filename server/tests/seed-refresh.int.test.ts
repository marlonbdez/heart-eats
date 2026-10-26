import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Restaurant } from '../src/models/restaurant.js';
import { Team } from '../src/models/team.js';
import { refreshDemoPlaces, type SeedEntry } from '../seed/refresh.js';
import { restaurantData } from './helpers/data.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';

const entries = JSON.parse(
  readFileSync(new URL('../seed/restaurants.json', import.meta.url), 'utf-8'),
) as SeedEntry[];

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

describe('refreshDemoPlaces', () => {
  it('crea los locales de ejemplo que faltan, con su equipo: el archivo es válido', async () => {
    const result = await refreshDemoPlaces(entries);

    expect(result).toEqual({
      created: entries.length,
      updated: 0,
      skipped: [],
    });
    expect(await Restaurant.countDocuments({ isDemo: true })).toBe(
      entries.length,
    );
    const withTeam = entries.filter((e) => e.team).length;
    expect(await Team.countDocuments()).toBe(withTeam);
  });

  it('pone al día los que ya están, sin duplicarlos ni tocar su equipo', async () => {
    await refreshDemoPlaces(entries);
    const slug = 'demo-la-masa-madre';
    await Restaurant.updateOne(
      { slug },
      { $unset: { priceRange: 1, menuUrl: 1, accessibility: 1 } },
    );
    const teams = await Team.countDocuments();

    const result = await refreshDemoPlaces(entries);

    expect(result).toEqual({
      created: 0,
      updated: entries.length,
      skipped: [],
    });
    expect(await Restaurant.countDocuments()).toBe(entries.length);
    expect(await Team.countDocuments()).toBe(teams);
    const place = await Restaurant.findOne({ slug }).lean();
    expect(place?.priceRange).toBe(2);
    expect(place?.menuUrl).toBe('https://example.org/carta');
    expect(place?.accessibility?.length).toBeGreaterThan(0);
    expect(place?.signatureDishes[0]?.price).toBe('9,50 €');
  });

  it('no toca el resto: los otros locales de ejemplo ni los reales', async () => {
    const stress = await Restaurant.create(
      restaurantData({
        slug: 'demo-stress-madrid-1',
        name: '[DEMO] Stress',
        isDemo: true,
      }),
    );
    const real = await Restaurant.create(
      restaurantData({ slug: 'casa-real', name: 'Casa Real' }),
    );

    await refreshDemoPlaces(entries);

    expect((await Restaurant.findById(stress._id).lean())?.name).toBe(
      '[DEMO] Stress',
    );
    expect((await Restaurant.findById(real._id).lean())?.name).toBe(
      'Casa Real',
    );
    expect(await Restaurant.countDocuments()).toBe(entries.length + 2);
  });

  it('si el slug de un local de ejemplo lo usa uno real, lo deja y lo dice', async () => {
    const real = await Restaurant.create(
      restaurantData({ slug: 'demo-la-masa-madre', name: 'Mi pizzería' }),
    );

    const result = await refreshDemoPlaces(entries);

    expect(result.skipped).toEqual(['demo-la-masa-madre']);
    expect(result.created).toBe(entries.length - 1);
    expect((await Restaurant.findById(real._id).lean())?.name).toBe(
      'Mi pizzería',
    );
  });
});
