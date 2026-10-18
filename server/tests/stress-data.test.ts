import { describe, expect, it } from 'vitest';
import { Restaurant } from '../src/models/restaurant.js';
import { Team } from '../src/models/team.js';
import {
  cities,
  generateStress,
  STRESS_SLUG_PREFIX,
} from '../seed/stress-data.js';

describe('datos de prueba por todo el mundo', () => {
  const places = generateStress(5);

  it('son válidos para los modelos', async () => {
    for (const { restaurant, team } of places) {
      await new Restaurant(restaurant).validate();
      if (team) {
        const doc = new Team({ ...team, restaurantId: new Restaurant()._id });
        await doc.validate();
      }
    }
  });

  it('están marcados como ejemplo y tienen slug único', () => {
    const slugs = places.map((p) => p.restaurant.slug as string);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const { restaurant } of places) {
      expect(restaurant.isDemo).toBe(true);
      expect(restaurant.slug).toMatch(new RegExp(`^${STRESS_SLUG_PREFIX}`));
      expect(restaurant.name).toMatch(/^\[DEMO\] /);
      expect((restaurant.name as string).length).toBeLessThanOrEqual(80);
    }
  });

  it('cubre varias regiones y es repetible', () => {
    const countries = new Set(
      places.map((p) => (p.restaurant.address as { country: string }).country),
    );
    expect(countries.size).toBeGreaterThanOrEqual(25);
    expect(places.length).toBeGreaterThanOrEqual(cities.length * 5);
    expect(generateStress(5)).toEqual(places);
  });
});
