import type { Restaurant } from '../../src/models/restaurant.js';

type RestaurantInput = Parameters<typeof Restaurant.create>[0];

// Un local publicado y verificado, con lo mínimo; cada prueba cambia lo suyo.
export function restaurantData(
  over: Record<string, unknown> = {},
): RestaurantInput {
  return {
    slug: 'demo-uno',
    name: '[DEMO] Uno',
    businessType: 'restaurant',
    foodTags: ['pizza'],
    address: {
      street: 'Calle 1',
      postalCode: '28012',
      neighborhood: 'Lavapiés',
      city: 'Madrid',
      country: 'ES',
    },
    location: { type: 'Point', coordinates: [-3.7012, 40.4085] },
    isIndependent: true,
    status: 'published',
    verification: {
      level: 'admin',
      method: 'visit',
      lastVerifiedAt: new Date('2026-09-02T00:00:00Z'),
    },
    isDemo: true,
    ...over,
  } as RestaurantInput;
}
