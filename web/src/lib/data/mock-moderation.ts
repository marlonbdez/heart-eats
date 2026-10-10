import type { ModerationItem } from '../types';

// Cola de ejemplo para el prototipo de moderación (F5). Los nombres y las
// direcciones son inventados.
export const moderationQueue: ModerationItem[] = [
  {
    id: 'm1',
    kind: 'new',
    name: 'Cocina del Pilar',
    neighborhood: 'Lavapiés',
    address: 'Calle de Ejemplo 8, 28012 Madrid',
    daysAgo: 2,
    contactMasked: 'p***@ejemplo.org',
    warnings: [],
    foodTags: ['set_menu', 'tapas'],
    dishes: ['Lentejas estofadas', 'Flan casero'],
    howKnown:
      'Voy cada semana. Varias personas del equipo vienen de una asociación del barrio.',
    evidenceUrl: 'https://asociacion-ejemplo.org/noticia-local',
  },
  {
    id: 'm2',
    kind: 'new',
    name: 'Panadería Sol y Harina',
    neighborhood: 'Chamberí',
    address: 'Calle de Muestra 21, 28010 Madrid',
    daysAgo: 3,
    warnings: [
      { kind: 'duplicate', other: '[DEMO] Panadería El Horno', meters: 40 },
      { kind: 'noEvidence' },
    ],
    foodTags: ['bakery', 'desserts'],
    dishes: ['Hogaza de centeno', 'Palmeras'],
    howKnown: 'Trabajo cerca y compro allí.',
  },
  {
    id: 'm3',
    kind: 'correction',
    name: '[DEMO] Café Paso a Paso',
    neighborhood: 'Lavapiés',
    address: 'Calle de Ejemplo 12, 28012 Madrid',
    daysAgo: 0,
    warnings: [],
    restaurantSlug: 'demo-cafe-paso-a-paso',
    correction: {
      kind: 'hours',
      before: '9:00 – 21:00',
      after: '9:00 – 15:00',
    },
  },
  {
    id: 'm4',
    kind: 'new',
    name: 'Burger Mega Express',
    neighborhood: 'Retiro',
    address: 'Avenida de Prueba 100, 28009 Madrid',
    daysAgo: 5,
    contactMasked: 'a***@ejemplo.com',
    warnings: [{ kind: 'chain' }],
    foodTags: ['burgers'],
    dishes: ['Menú doble'],
    howKnown: 'Es mi cadena favorita.',
  },
];
