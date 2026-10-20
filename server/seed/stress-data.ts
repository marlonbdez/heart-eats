// Genera locales ficticios por todo el mundo para probar la carga, el cambio
// de región y de idioma. Es determinista: con los mismos parámetros salen los
// mismos locales. Todos llevan isDemo y «[DEMO]» en el nombre, así que
// `npm run seed -- --clear` los quita.
import {
  businessTypes,
  consentBy,
  cuisineTypes,
  disabilityTypes,
  foodTags,
  teamAreas,
} from '../src/catalog.js';
import { photoRef, photosFor } from './demo-photos.js';

export const STRESS_SLUG_PREFIX = 'demo-stress-';

interface City {
  key: string;
  name: string;
  // Cómo se llama la ciudad en cada idioma de la web, si no es como `name`.
  labels?: { es: string; en: string };
  country: string;
  lat: number;
  lng: number;
  // Cuántas veces más locales que el resto (Madrid es la zona real).
  weight?: number;
  street: string;
  names: string[];
}

export const cities: City[] = [
  {
    key: 'madrid',
    name: 'Madrid',
    country: 'ES',
    lat: 40.4168,
    lng: -3.7038,
    weight: 4,
    street: 'Calle de Ejemplo',
    names: [
      'La Cocina de Ana',
      'Casa Pepe',
      'El Rincón',
      'Tapas del Barrio',
      'La Panera',
    ],
  },
  {
    key: 'barcelona',
    name: 'Barcelona',
    country: 'ES',
    lat: 41.3874,
    lng: 2.1686,
    street: 'Carrer d’Exemple',
    names: ['Can Joan', 'El Forn', 'La Taverna', 'Cafè del Mar'],
  },
  {
    key: 'sevilla',
    name: 'Sevilla',
    labels: { es: 'Sevilla', en: 'Seville' },
    country: 'ES',
    lat: 37.3891,
    lng: -5.9845,
    street: 'Calle Ejemplo',
    names: ['Bar La Giralda', 'Casa Lola', 'Tapería Sur'],
  },
  {
    key: 'lisboa',
    name: 'Lisboa',
    labels: { es: 'Lisboa', en: 'Lisbon' },
    country: 'PT',
    lat: 38.7223,
    lng: -9.1393,
    street: 'Rua do Exemplo',
    names: ['Tasca do Zé', 'Pastelaria Sol', 'Casa Azul'],
  },
  {
    key: 'paris',
    name: 'Paris',
    labels: { es: 'París', en: 'Paris' },
    country: 'FR',
    lat: 48.8566,
    lng: 2.3522,
    street: 'Rue de l’Exemple',
    names: ['Chez Marie', 'Le Petit Four', 'Café des Amis'],
  },
  {
    key: 'londres',
    name: 'London',
    labels: { es: 'Londres', en: 'London' },
    country: 'GB',
    lat: 51.5072,
    lng: -0.1276,
    street: 'Example Street',
    names: ['The Kind Kitchen', 'Corner Café', 'Baker’s Table'],
  },
  {
    key: 'berlin',
    name: 'Berlin',
    labels: { es: 'Berlín', en: 'Berlin' },
    country: 'DE',
    lat: 52.52,
    lng: 13.405,
    street: 'Beispielstraße',
    names: ['Zum Löwen', 'Bäckerei Mitte', 'Café Süß'],
  },
  {
    key: 'roma',
    name: 'Roma',
    labels: { es: 'Roma', en: 'Rome' },
    country: 'IT',
    lat: 41.9028,
    lng: 12.4964,
    street: 'Via Esempio',
    names: ['Trattoria da Gino', 'Forno Antico', 'Caffè Luna'],
  },
  {
    key: 'estocolmo',
    name: 'Stockholm',
    labels: { es: 'Estocolmo', en: 'Stockholm' },
    country: 'SE',
    lat: 59.3293,
    lng: 18.0686,
    street: 'Exempelgatan',
    names: ['Fika Huset', 'Köket', 'Bageri Norr'],
  },
  {
    key: 'atenas',
    name: 'Αθήνα',
    labels: { es: 'Atenas', en: 'Athens' },
    country: 'GR',
    lat: 37.9838,
    lng: 23.7275,
    street: 'Οδός Παραδείγματος',
    names: ['Ταβέρνα του Γιάννη', 'Καφενείο', 'Φούρνος'],
  },
  {
    key: 'estambul',
    name: 'İstanbul',
    labels: { es: 'Estambul', en: 'Istanbul' },
    country: 'TR',
    lat: 41.0082,
    lng: 28.9784,
    street: 'Örnek Sokak',
    names: ['Çiçek Lokanta', 'Şeker Pastanesi', 'Meyhane Mavi'],
  },
  {
    key: 'el-cairo',
    name: 'القاهرة',
    labels: { es: 'El Cairo', en: 'Cairo' },
    country: 'EG',
    lat: 30.0444,
    lng: 31.2357,
    street: 'شارع المثال',
    names: ['مطعم النيل', 'مخبز الأمل', 'قهوة الحي'],
  },
  {
    key: 'casablanca',
    name: 'Casablanca',
    country: 'MA',
    lat: 33.5731,
    lng: -7.5898,
    street: 'Rue Exemple',
    names: ['Café Atlas', 'Riad Gourmand', 'Pâtisserie Fès'],
  },
  {
    key: 'lagos',
    name: 'Lagos',
    country: 'NG',
    lat: 6.5244,
    lng: 3.3792,
    street: 'Example Road',
    names: ['Mama’s Kitchen', 'Sunrise Bukka', 'Café Eko'],
  },
  {
    key: 'nairobi',
    name: 'Nairobi',
    country: 'KE',
    lat: -1.2921,
    lng: 36.8219,
    street: 'Example Avenue',
    names: ['Mama Njeri', 'Karibu Café', 'Savannah Bites'],
  },
  {
    key: 'ciudad-del-cabo',
    name: 'Cape Town',
    labels: { es: 'Ciudad del Cabo', en: 'Cape Town' },
    country: 'ZA',
    lat: -33.9249,
    lng: 18.4241,
    street: 'Example Street',
    names: ['The Bay Table', 'Protea Café', 'Table Mountain Bakery'],
  },
  {
    key: 'dubai',
    name: 'Dubai',
    labels: { es: 'Dubái', en: 'Dubai' },
    country: 'AE',
    lat: 25.2048,
    lng: 55.2708,
    street: 'Example Street',
    names: ['Oasis Kitchen', 'Souk Café', 'Palm Bakery'],
  },
  {
    key: 'mumbai',
    name: 'Mumbai',
    labels: { es: 'Bombay', en: 'Mumbai' },
    country: 'IN',
    lat: 19.076,
    lng: 72.8777,
    street: 'Example Marg',
    names: ['Chai Ghar', 'Annapurna', 'Sweet Corner'],
  },
  {
    key: 'bangkok',
    name: 'กรุงเทพมหานคร',
    labels: { es: 'Bangkok', en: 'Bangkok' },
    country: 'TH',
    lat: 13.7563,
    lng: 100.5018,
    street: 'ถนนตัวอย่าง',
    names: ['ร้านข้าวบ้านสวน', 'กาแฟยามเช้า', 'ครัวป้านิด'],
  },
  {
    key: 'singapur',
    name: 'Singapore',
    labels: { es: 'Singapur', en: 'Singapore' },
    country: 'SG',
    lat: 1.3521,
    lng: 103.8198,
    street: 'Example Lane',
    names: ['Hawker Heart', 'Kopi Corner', 'Lion City Kitchen'],
  },
  {
    key: 'tokio',
    name: '東京',
    labels: { es: 'Tokio', en: 'Tokyo' },
    country: 'JP',
    lat: 35.6762,
    lng: 139.6503,
    street: '例通り',
    names: ['さくら食堂', 'パン工房', 'こころカフェ'],
  },
  {
    key: 'seul',
    name: '서울',
    labels: { es: 'Seúl', en: 'Seoul' },
    country: 'KR',
    lat: 37.5665,
    lng: 126.978,
    street: '예시로',
    names: ['행복식당', '커피 한잔', '빵굽는집'],
  },
  {
    key: 'pekin',
    name: '北京',
    labels: { es: 'Pekín', en: 'Beijing' },
    country: 'CN',
    lat: 39.9042,
    lng: 116.4074,
    street: '示例路',
    names: ['小厨房', '好味道', '面包坊'],
  },
  {
    key: 'sidney',
    name: 'Sydney',
    country: 'AU',
    lat: -33.8688,
    lng: 151.2093,
    street: 'Example Street',
    names: ['Harbour Café', 'Bondi Bakes', 'The Kind Table'],
  },
  {
    key: 'auckland',
    name: 'Auckland',
    country: 'NZ',
    lat: -36.8509,
    lng: 174.7645,
    street: 'Example Road',
    names: ['Kiwi Kitchen', 'Flat White Co', 'Harbour Bakery'],
  },
  {
    key: 'nueva-york',
    name: 'New York',
    labels: { es: 'Nueva York', en: 'New York' },
    country: 'US',
    lat: 40.7128,
    lng: -74.006,
    street: 'Example Street',
    names: ['Corner Diner', 'Brooklyn Bakes', 'Heart Café'],
  },
  {
    key: 'san-francisco',
    name: 'San Francisco',
    country: 'US',
    lat: 37.7749,
    lng: -122.4194,
    street: 'Example Street',
    names: ['Bay Roast', 'Sourdough Co', 'Fog City Kitchen'],
  },
  {
    key: 'toronto',
    name: 'Toronto',
    country: 'CA',
    lat: 43.6532,
    lng: -79.3832,
    street: 'Example Street',
    names: ['Maple Table', 'The Good Cup', 'North Bakery'],
  },
  {
    key: 'ciudad-de-mexico',
    name: 'Ciudad de México',
    labels: { es: 'Ciudad de México', en: 'Mexico City' },
    country: 'MX',
    lat: 19.4326,
    lng: -99.1332,
    street: 'Calle Ejemplo',
    names: ['Fonda Doña Rosa', 'Taquería El Sol', 'Panadería La Concha'],
  },
  {
    key: 'bogota',
    name: 'Bogotá',
    country: 'CO',
    lat: 4.711,
    lng: -74.0721,
    street: 'Carrera Ejemplo',
    names: ['Ajiaco de la Abuela', 'Café Andino', 'Arepas del Parque'],
  },
  {
    key: 'lima',
    name: 'Lima',
    country: 'PE',
    lat: -12.0464,
    lng: -77.0428,
    street: 'Jirón Ejemplo',
    names: ['Cevichería Miraflores', 'Panadería Inca', 'Café Pacífico'],
  },
  {
    key: 'buenos-aires',
    name: 'Buenos Aires',
    country: 'AR',
    lat: -34.6037,
    lng: -58.3816,
    street: 'Calle Ejemplo',
    names: ['Parrilla Don Ramón', 'Café Tortoni Chico', 'Facturas del Sur'],
  },
  {
    key: 'santiago',
    name: 'Santiago',
    country: 'CL',
    lat: -33.4489,
    lng: -70.6693,
    street: 'Calle Ejemplo',
    names: ['Completos Pepe', 'Café Cordillera', 'Panadería Maitén'],
  },
  {
    key: 'sao-paulo',
    name: 'São Paulo',
    country: 'BR',
    lat: -23.5505,
    lng: -46.6333,
    street: 'Rua do Exemplo',
    names: ['Padaria Estrela', 'Cantina Nonna', 'Café Paulista'],
  },
  {
    key: 'reykjavik',
    name: 'Reykjavík',
    country: 'IS',
    lat: 64.1466,
    lng: -21.9426,
    street: 'Dæmigata',
    names: ['Kaffi Hlýja', 'Bakarí Norðan', 'Matur og Mannlíf'],
  },
  {
    key: 'honolulu',
    name: 'Honolulu',
    country: 'US',
    lat: 21.3069,
    lng: -157.8583,
    street: 'Example Street',
    names: ['Aloha Table', 'Poke House', 'Island Bakery'],
  },
  {
    key: 'wellington',
    name: 'Wellington',
    country: 'NZ',
    lat: -41.2866,
    lng: 174.7756,
    street: 'Example Street',
    names: ['Windy Café', 'Cuba Kitchen', 'Harbour Table'],
  },
  {
    key: 'quito',
    name: 'Quito',
    country: 'EC',
    lat: -0.1807,
    lng: -78.4678,
    street: 'Calle Ejemplo',
    names: ['Locro del Barrio', 'Café Mitad', 'Panadería Andina'],
  },
  {
    key: 'tbilisi',
    name: 'თბილისი',
    country: 'GE',
    lat: 41.7151,
    lng: 44.8271,
    street: 'მაგალითის ქუჩა',
    names: ['ხინკლის სახლი', 'პური და ღვინო', 'ყავის კუთხე'],
  },
];

const descriptions = [
  { es: 'Cocina casera de temporada.', en: 'Seasonal home cooking.' },
  {
    es: 'Café de especialidad y repostería.',
    en: 'Specialty coffee and pastries.',
  },
  { es: 'Un lugar tranquilo para comer sin prisa.' },
  { en: 'A calm place to eat without rushing.' },
  {
    es: 'Pan de masa madre cada mañana.',
    en: 'Sourdough bread every morning.',
  },
  {
    es: 'Menú del día y platos para compartir.',
    en: 'Set lunch and sharing plates.',
  },
];

const dishes = [
  { name: 'Plato del día', description: 'Cambia cada semana.' },
  { name: 'Tarta de la casa', description: 'Receta propia.' },
  { name: 'Café con leche' },
  { name: 'Ensalada templada' },
  { name: 'Bocadillo especial', description: 'Con pan recién hecho.' },
  { name: 'Sopa del día' },
];

const stories = [
  {
    displayName: 'Persona de ejemplo',
    role: 'Cocina',
    storyText:
      'Historia ficticia para probar cómo se ve el equipo en la ficha. No es una persona real.',
  },
  {
    displayName: 'Example Person',
    role: 'Dining room',
    storyText:
      'A made-up story to check how the team looks on the page. Not a real person.',
  },
];

// Generador pseudoaleatorio con semilla (mulberry32).
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Doc = Record<string, unknown>;
export interface StressPlace {
  restaurant: Doc;
  team?: Doc;
}

export function generateStress(
  perCity: number,
  seed = 20261018,
): StressPlace[] {
  const rand = rng(seed);
  const pick = <T>(list: readonly T[]) =>
    list[Math.floor(rand() * list.length)]!;
  const chance = (p: number) => rand() < p;
  const places: StressPlace[] = [];

  for (const city of cities) {
    const count = Math.round(perCity * (city.weight ?? 1));
    for (let i = 1; i <= count; i++) {
      const slug = `${STRESS_SLUG_PREFIX}${city.key}-${i}`;
      const base = pick(city.names);
      // Casos límite repartidos: un nombre en el máximo de longitud (80).
      const longName = i === 1 && city.key === 'madrid';
      const name = longName
        ? `[DEMO] ${'Restaurante con un nombre muy largo '.repeat(3)}`
            .slice(0, 80)
            .trim()
        : `[DEMO] ${base} ${i}`;

      const description = chance(0.15) ? undefined : pick(descriptions);
      const hours = chance(0.1)
        ? []
        : [0, 1, 2, 3, 4, 5, 6]
            .filter(() => chance(0.85))
            .map((day) => ({ day, open: '09:00', close: '22:30' }));

      const verified = chance(0.8);
      const status = chance(0.05)
        ? 'archived'
        : chance(0.05)
          ? 'pending'
          : 'published';
      const tags = [
        pick(foodTags).key,
        ...(chance(0.4) ? [pick(foodTags).key] : []),
      ];

      const restaurant: Doc = {
        slug,
        name,
        ...(description && { description }),
        businessType: pick(businessTypes),
        cuisineTypes: chance(0.6) ? [pick(cuisineTypes)] : [],
        foodTags: [...new Set(tags)],
        address: {
          street: `${city.street} ${1 + Math.floor(rand() * 120)}`,
          postalCode: String(10000 + Math.floor(rand() * 89999)),
          city: city.name,
          ...(city.labels && { cityNames: city.labels }),
          country: city.country,
        },
        location: {
          type: 'Point',
          coordinates: [
            Number((city.lng + (rand() - 0.5) * 0.12).toFixed(5)),
            Number((city.lat + (rand() - 0.5) * 0.08).toFixed(5)),
          ],
        },
        openingHours: hours,
        signatureDishes: Array.from({ length: Math.floor(rand() * 4) }, () =>
          pick(dishes),
        ).filter(
          (dish, index, all) =>
            all.findIndex((d) => d.name === dish.name) === index,
        ),
        photos: [photoRef(pick(photosFor(tags)))],
        isIndependent: true,
        status,
        verification: verified
          ? {
              level: chance(0.5) ? 'admin' : 'community',
              method: pick([
                'visit',
                'call',
                'documentation',
                'owner_confirmed',
              ] as const),
              lastVerifiedAt: new Date('2026-09-15T00:00:00Z'),
            }
          : { level: 'unverified' },
        ownerConfirmedAt: new Date('2026-09-01T00:00:00Z'),
        isDemo: true,
      };

      let team: Doc | undefined;
      if (chance(0.7)) {
        const total = 3 + Math.floor(rand() * 25);
        team = {
          visibilityLevel: pick(['minimal', 'medium', 'full'] as const),
          summary: {
            totalStaff: total,
            staffWithDisability: 1 + Math.floor(rand() * Math.min(total, 8)),
          },
          areas: [...new Set([pick(teamAreas), pick(teamAreas)])],
          disabilityTypes: [
            ...new Set([pick(disabilityTypes), pick(disabilityTypes)]),
          ],
          ...(chance(0.15) && {
            stories: [
              {
                ...pick(stories),
                consentRecordedAt: new Date('2026-09-01T00:00:00Z'),
                consentBy: pick(consentBy),
              },
            ],
          }),
        };
      }
      places.push({ restaurant, ...(team && { team }) });
    }
  }
  return places;
}
