// La cola de moderación tal como la devuelve la API (GET /suggestions).
// Nombres y direcciones inventados.
const base = {
  warnings: [],
  locale: 'es',
  contactMasked: 'p***@ejemplo.org',
};
const daysAgo = (n: number) =>
  new Date(Date.now() - n * 24 * 60 * 60_000).toISOString();

export interface ApiSuggestion extends Record<string, unknown> {
  id: string;
  type: 'new' | 'edit' | 'team' | 'removal';
  status: 'pending' | 'info_requested' | 'approved' | 'rejected';
}

export const suggestions: ApiSuggestion[] = [
  {
    ...base,
    id: 's1',
    type: 'new',
    status: 'pending',
    createdAt: daysAgo(2),
    name: 'Cocina del Pilar',
    neighborhood: 'Madrid',
    address: 'Calle del Pilar 4, 28012, Madrid',
    foodTags: ['tapas'],
    dishes: ['Croquetas de la casa'],
    howKnown: 'Lo conozco del barrio.',
    location: { lat: 40.4085, lng: -3.7012 },
  },
  {
    ...base,
    id: 's2',
    type: 'new',
    status: 'pending',
    createdAt: daysAgo(1),
    name: 'Burger Mega Express',
    neighborhood: 'Madrid',
    address: 'Calle Mayor 1, Madrid',
    foodTags: ['burgers'],
    dishes: [],
    warnings: [{ kind: 'chain' }, { kind: 'noEvidence' }],
  },
  {
    ...base,
    id: 's3',
    type: 'edit',
    status: 'pending',
    createdAt: daysAgo(3),
    name: '[DEMO] Café Paso a Paso',
    neighborhood: 'Malasaña',
    address: 'Calle del Pez 3, Madrid',
    restaurantSlug: 'demo-cafe-paso-a-paso',
    correction: {
      kind: 'address',
      before: 'Calle del Pez 3',
      after: 'Se ha mudado al número 9.',
    },
  },
  {
    ...base,
    id: 's4',
    type: 'removal',
    status: 'pending',
    createdAt: daysAgo(4),
    name: '[DEMO] La Masa Madre',
    neighborhood: 'Lavapiés',
    address: 'Calle 1, Madrid',
    restaurantSlug: 'demo-la-masa-madre',
    removal: { what: 'story', details: 'Prefiero que no aparezca.' },
  },
  {
    ...base,
    id: 's5',
    type: 'new',
    status: 'info_requested',
    createdAt: daysAgo(6),
    name: 'Casa Lola',
    neighborhood: 'Madrid',
    address: 'Plaza Chica 2, Madrid',
    foodTags: ['coffee'],
    dishes: ['Café con leche'],
    infoRequest: {
      note: '¿Tenéis web o redes?',
      deadline: daysAgo(-24),
    },
    replies: [{ message: 'Sí, está en nuestro perfil.', at: daysAgo(1) }],
  },
  {
    ...base,
    id: 's6',
    type: 'new',
    status: 'approved',
    createdAt: daysAgo(9),
    name: 'Horno Viejo',
    neighborhood: 'Madrid',
    address: 'Calle Horno 5, Madrid',
    foodTags: ['bakery'],
    dishes: [],
  },
];
