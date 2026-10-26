import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import type { RestaurantRecord } from '../src/models/restaurant.js';
import {
  needsReview,
  toPublicRestaurant,
} from '../src/services/restaurant-public.js';

const now = new Date('2026-10-13T00:00:00Z');

const record = (over: Partial<RestaurantRecord> = {}): RestaurantRecord => ({
  _id: new Types.ObjectId(),
  slug: 'demo-uno',
  name: '[DEMO] Uno',
  businessType: 'restaurant',
  cuisineTypes: [],
  foodTags: ['pizza'],
  address: { street: 'Calle 1', city: 'Madrid', country: 'ES' },
  location: { type: 'Point', coordinates: [-3.7, 40.4] },
  openingHours: [],
  signatureDishes: [],
  isIndependent: true,
  status: 'published',
  verification: {
    level: 'admin',
    method: 'visit',
    lastVerifiedAt: new Date('2026-09-01T00:00:00Z'),
  },
  ...over,
});

describe('needsReview', () => {
  it('pide revisión pasados 12 meses', () => {
    expect(needsReview(new Date('2025-10-12T00:00:00Z'), now)).toBe(true);
    expect(needsReview(new Date('2025-10-14T00:00:00Z'), now)).toBe(false);
  });
});

describe('toPublicRestaurant', () => {
  it('invierte las coordenadas: la base guarda [lng, lat]', () => {
    expect(toPublicRestaurant(record(), undefined, now).location).toEqual({
      lat: 40.4,
      lng: -3.7,
    });
  });

  it('da la zona horaria del local, que sale de su pin', () => {
    const at = (lng: number, lat: number) =>
      toPublicRestaurant(
        record({ location: { type: 'Point', coordinates: [lng, lat] } }),
        undefined,
        now,
      ).timezone;
    expect(at(-3.7, 40.4)).toBe('Europe/Madrid');
    expect(at(-15.43, 28.12)).toBe('Atlantic/Canary');
    expect(at(139.69, 35.68)).toBe('Asia/Tokyo');
    expect(at(-58.38, -34.6)).toBe('America/Argentina/Buenos_Aires');
  });

  it('da el precio medio y la carta solo si el local los tiene', () => {
    const bare = toPublicRestaurant(record(), undefined, now);
    expect(bare).not.toHaveProperty('priceRange');
    expect(bare).not.toHaveProperty('menuUrl');

    const full = toPublicRestaurant(
      record({ priceRange: 2, menuUrl: 'https://uno.example/carta' }),
      undefined,
      now,
    );
    expect(full.priceRange).toBe(2);
    expect(full.menuUrl).toBe('https://uno.example/carta');
  });

  it('no filtra campos internos', () => {
    const result = toPublicRestaurant(
      { ...record(), searchText: 'x', cityKey: 'madrid', __v: 0 } as never,
      undefined,
      now,
    );
    const json = JSON.stringify(result);
    for (const internal of [
      '_id',
      'searchText',
      'cityKey',
      '__v',
      'status',
      'isIndependent',
      'createdAt',
    ]) {
      expect(json).not.toContain(internal);
    }
  });

  it('calcula needsReview y pasa las fechas en ISO', () => {
    const result = toPublicRestaurant(
      record({
        verification: {
          level: 'community',
          method: 'owner_confirmed',
          lastVerifiedAt: new Date('2025-08-01T00:00:00Z'),
        },
      }),
      undefined,
      now,
    );
    expect(result.verification).toEqual({
      level: 'community',
      method: 'owner_confirmed',
      lastVerifiedAt: '2025-08-01T00:00:00.000Z',
      needsReview: true,
    });
  });

  it('marca isDemo solo cuando lo es', () => {
    expect(toPublicRestaurant(record(), undefined, now)).not.toHaveProperty(
      'isDemo',
    );
    expect(
      toPublicRestaurant(record({ isDemo: true }), undefined, now).isDemo,
    ).toBe(true);
  });

  it('sin equipo en la lista, no manda team', () => {
    expect(toPublicRestaurant(record(), undefined, now)).not.toHaveProperty(
      'team',
    );
  });
});
