import type { FoodTag, Restaurant } from '../../src/lib/types';

export const foodTags: FoodTag[] = [
  { key: 'spanish', icon: '🥘' },
  { key: 'tapas', icon: '🫒' },
  { key: 'set_menu', icon: '🍽️' },
  { key: 'coffee', icon: '☕' },
  { key: 'brunch', icon: '🥞' },
  { key: 'bakery', icon: '🥖' },
  { key: 'desserts', icon: '🍰' },
  { key: 'italian', icon: '🍝' },
  { key: 'pizza', icon: '🍕' },
  { key: 'burgers', icon: '🍔' },
  { key: 'asian', icon: '🥢' },
  { key: 'sushi', icon: '🍣' },
  { key: 'mexican', icon: '🌮' },
  { key: 'latin', icon: '🥑' },
  { key: 'arab', icon: '🧆' },
  { key: 'seafood', icon: '🦐' },
  { key: 'rice', icon: '🍚' },
  { key: 'grill', icon: '🥩' },
  { key: 'vegetarian', icon: '🥗' },
  { key: 'vegan', icon: '🌱' },
];

const week = (open: string, close: string, days: number[]) =>
  days.map((day) => ({
    day: day as 0 | 1 | 2 | 3 | 4 | 5 | 6,
    open,
    close,
  }));

// Una foto publicada: la API la sirve en /photos/<archivo> (la prueba responde
// con una imagen cualquiera).
const photo = (n: number, alt?: Record<string, string>) => ({
  url: `http://localhost:3001/api/v1/photos/0b8e3a52-5a43-4b8a-9d5e-00000000010${n}.webp`,
  thumbUrl: `http://localhost:3001/api/v1/photos/0b8e3a52-5a43-4b8a-9d5e-00000000010${n}-thumb.webp`,
  ...(alt && { alt }),
});

// Datos ficticios. Nada de esto es un negocio real.
const base: Restaurant[] = [
  {
    slug: 'demo-la-masa-madre',
    name: '[DEMO] La Masa Madre',
    description: { es: 'Pizzería de barrio con masa de 48 horas.' },
    priceRange: 2,
    menuUrl: 'https://masamadre.example/carta',
    accessibility: ['step_free_entrance', 'accessible_restroom', 'quiet_space'],
    businessType: 'restaurant',
    cuisineTypes: ['italian'],
    foodTags: ['pizza', 'italian', 'mexican'],
    address: {
      street: 'Calle de Ejemplo 12',
      postalCode: '28012',
      neighborhood: 'Lavapiés',
      city: 'Madrid',
      country: 'ES',
    },
    location: { lat: 40.4085, lng: -3.7012 },
    contact: { phone: '+34 600 000 001', website: 'https://example.org' },
    openingHours: week('13:00', '23:30', [0, 2, 3, 4, 5, 6]),
    signatureDishes: [
      {
        name: 'Margarita de la casa',
        description: 'Tomate, mozzarella fresca y albahaca.',
        price: '9,50 €',
        photoUrl:
          'http://localhost:3001/api/v1/photos/0b8e3a52-5a43-4b8a-9d5e-000000000106.webp',
        thumbUrl:
          'http://localhost:3001/api/v1/photos/0b8e3a52-5a43-4b8a-9d5e-000000000106-thumb.webp',
      },
      { name: 'Focaccia de romero' },
    ],
    photos: [
      photo(1, {
        es: 'La barra con taburetes de madera',
        en: 'The wooden bar',
      }),
      photo(2),
      photo(3, { es: 'Una mesa con pizzas recién hechas' }),
      photo(4),
      photo(5),
    ],
    ownerConfirmedAt: '2026-09-01T00:00:00Z',
    team: {
      level: 'medium',
      summary: { totalStaff: 11, staffWithDisability: 4 },
      areas: ['kitchen', 'dining'],
      disabilityTypes: ['hearing_impairment', 'intellectual_disability'],
    },
    verification: {
      level: 'admin',
      method: 'visit',
      lastVerifiedAt: '2026-09-02T00:00:00Z',
      needsReview: false,
    },
    isDemo: true,
  },
  {
    slug: 'demo-cafe-paso-a-paso',
    name: '[DEMO] Café Paso a Paso',
    description: { es: 'Cafetería de especialidad y repostería casera.' },
    businessType: 'cafe',
    cuisineTypes: [],
    foodTags: ['coffee', 'desserts', 'bakery', 'brunch'],
    address: {
      street: 'Calle de Muestra 5',
      postalCode: '28004',
      neighborhood: 'Malasaña',
      city: 'Madrid',
      country: 'ES',
    },
    location: { lat: 40.4263, lng: -3.7041 },
    contact: { instagram: '@ejemplo' },
    openingHours: week('08:00', '20:00', [1, 2, 3, 4, 5, 6]),
    signatureDishes: [], // un café puede no tener plato estrella
    photos: [photo(7)], // una sola foto: sin mosaico ni flechas
    team: {
      level: 'minimal',
      summary: { totalStaff: 6, staffWithDisability: 2 },
    },
    verification: {
      level: 'community',
      method: 'owner_confirmed',
      lastVerifiedAt: '2026-07-15T00:00:00Z',
      needsReview: false,
    },
    isDemo: true,
  },
  {
    slug: 'demo-taberna-la-vereda',
    name: '[DEMO] Taberna La Vereda',
    description: { es: 'Tapas y menú del día con producto de temporada.' },
    businessType: 'bar',
    cuisineTypes: ['spanish'],
    foodTags: ['tapas', 'set_menu', 'spanish'],
    address: {
      street: 'Plaza de Prueba 3',
      postalCode: '28005',
      neighborhood: 'La Latina',
      city: 'Madrid',
      country: 'ES',
    },
    location: { lat: 40.4125, lng: -3.7083 },
    contact: { phone: '+34 600 000 003' },
    openingHours: week('12:00', '00:00', [0, 1, 2, 3, 4, 5, 6]),
    signatureDishes: [
      { name: 'Croquetas de jamón' },
      { name: 'Menú del día', description: 'Primero, segundo y postre.' },
    ],
    ownerConfirmedAt: '2026-09-01T00:00:00Z',
    team: {
      level: 'full',
      summary: { totalStaff: 9, staffWithDisability: 3 },
      areas: ['bar'],
      disabilityTypes: ['physical_disability'],
      stories: [
        {
          displayName: 'Persona de ejemplo',
          role: 'Cocina',
          storyText: 'Texto ficticio de ejemplo para maquetar la historia.',
        },
      ],
    },
    verification: {
      level: 'admin',
      method: 'documentation',
      lastVerifiedAt: '2025-08-01T00:00:00Z',
      needsReview: true,
    },
    isDemo: true,
  },
  {
    slug: 'demo-verde-que-te-quiero',
    name: '[DEMO] Verde que te quiero',
    description: { es: 'Cocina vegetariana de temporada.' },
    businessType: 'restaurant',
    cuisineTypes: ['vegetarian'],
    foodTags: ['vegetarian', 'set_menu', 'vegan'],
    address: {
      street: 'Calle de Ensayo 20',
      postalCode: '28010',
      neighborhood: 'Chamberí',
      city: 'Madrid',
      country: 'ES',
    },
    location: { lat: 40.4339, lng: -3.7028 },
    contact: { website: 'https://example.org' },
    openingHours: week('13:00', '16:30', [1, 2, 3, 4, 5]),
    signatureDishes: [{ name: 'Bol de legumbres y verduras asadas' }],
    team: {
      level: 'minimal',
      summary: { totalStaff: 8, staffWithDisability: 3 },
    },
    verification: {
      level: 'community',
      method: 'call',
      lastVerifiedAt: '2026-06-20T00:00:00Z',
      needsReview: false,
    },
    isDemo: true,
  },
  {
    slug: 'demo-panaderia-el-horno',
    name: '[DEMO] Panadería El Horno',
    businessType: 'bakery',
    cuisineTypes: [],
    foodTags: ['bakery', 'desserts', 'coffee', 'asian'],
    address: {
      street: 'Calle de Demostración 7',
      postalCode: '28045',
      neighborhood: 'Arganzuela',
      city: 'Madrid',
      country: 'ES',
    },
    location: { lat: 40.3979, lng: -3.6957 },
    contact: {},
    openingHours: week('07:00', '15:00', [1, 2, 3, 4, 5, 6]),
    signatureDishes: [{ name: 'Pan de masa madre' }],
    verification: {
      level: 'admin',
      method: 'visit',
      lastVerifiedAt: '2026-08-10T00:00:00Z',
      needsReview: false,
    },
    isDemo: true,
  },
  {
    slug: 'demo-burger-del-barrio',
    name: '[DEMO] Burger del Barrio',
    businessType: 'restaurant',
    cuisineTypes: ['american'],
    foodTags: ['burgers', 'arab'],
    address: {
      street: 'Calle de Maqueta 31',
      postalCode: '28028',
      neighborhood: 'Salamanca',
      city: 'Madrid',
      country: 'ES',
    },
    location: { lat: 40.4297, lng: -3.6773 },
    contact: { phone: '+34 600 000 006' },
    openingHours: week('13:00', '23:00', [0, 1, 2, 3, 4, 5, 6]),
    signatureDishes: [
      {
        name: 'Hamburguesa clásica',
        description: 'Carne de ternera y cheddar.',
      },
    ],
    team: {
      level: 'minimal',
      summary: { totalStaff: 14, staffWithDisability: 5 },
    },
    verification: {
      level: 'community',
      method: 'owner_confirmed',
      lastVerifiedAt: '2026-09-18T00:00:00Z',
      needsReview: false,
    },
    isDemo: true,
  },
  {
    slug: 'demo-cafe-del-mar',
    name: '[DEMO] Cafè del Mar',
    businessType: 'cafe',
    cuisineTypes: [],
    foodTags: ['coffee'],
    address: {
      street: 'Carrer de Maqueta 3',
      postalCode: '08001',
      city: 'Barcelona',
      country: 'ES',
    },
    location: { lat: 41.3851, lng: 2.1734 },
    contact: {},
    openingHours: week('09:00', '20:00', [1, 2, 3, 4, 5]),
    signatureDishes: [],
    team: {
      level: 'minimal',
      summary: { totalStaff: 6, staffWithDisability: 2 },
    },
    verification: {
      level: 'community',
      method: 'owner_confirmed',
      lastVerifiedAt: '2026-09-18T00:00:00Z',
      needsReview: false,
    },
    isDemo: true,
  },
  {
    slug: 'demo-forn-gotic',
    name: '[DEMO] Forn Gòtic',
    businessType: 'cafe',
    cuisineTypes: [],
    foodTags: ['bakery'],
    address: {
      street: 'Carrer de Maqueta 9',
      postalCode: '08002',
      city: 'Barcelona',
      country: 'ES',
    },
    location: { lat: 41.3825, lng: 2.1769 },
    contact: {},
    openingHours: week('09:00', '20:00', [1, 2, 3, 4, 5]),
    signatureDishes: [],
    team: {
      level: 'minimal',
      summary: { totalStaff: 6, staffWithDisability: 2 },
    },
    verification: {
      level: 'community',
      method: 'owner_confirmed',
      lastVerifiedAt: '2026-09-18T00:00:00Z',
      needsReview: false,
    },
    isDemo: true,
  },
  {
    slug: 'demo-sakura-shokudo',
    name: '[DEMO] さくら食堂',
    businessType: 'cafe',
    cuisineTypes: [],
    foodTags: ['sushi'],
    address: {
      street: '例通り 5',
      postalCode: '100-0001',
      city: '東京',
      country: 'JP',
    },
    location: { lat: 35.6762, lng: 139.6503 },
    contact: {},
    openingHours: week('09:00', '20:00', [1, 2, 3, 4, 5]),
    signatureDishes: [],
    team: {
      level: 'minimal',
      summary: { totalStaff: 6, staffWithDisability: 2 },
    },
    verification: {
      level: 'community',
      method: 'owner_confirmed',
      lastVerifiedAt: '2026-09-18T00:00:00Z',
      needsReview: false,
    },
    isDemo: true,
  },
];

const ZONES: Record<string, string> = { ES: 'Europe/Madrid', JP: 'Asia/Tokyo' };

// La API da la zona horaria de cada local; aquí sale del país.
export const restaurants: Restaurant[] = base.map((r) => ({
  ...r,
  timezone: ZONES[r.address.country],
}));
