import { Restaurant } from '../models/restaurant.js';
import { Suggestion, type SuggestionWarning } from '../models/suggestion.js';
import { normalize } from '../text.js';

// Límite de candidatos que se comparan al buscar duplicados en una ciudad.
const CANDIDATES = 500;

export interface ProposedPlace {
  name: string;
  street?: string;
  cityKey: string;
}

// Nombre o calle sin acentos, mayúsculas ni espacios de más.
export const placeKey = (value: string) =>
  normalize(value).replace(/\s+/g, ' ');

// ¿El nombre contiene alguno de los nombres de la lista de cadenas?
// La lista es configuración (KNOWN_CHAINS), no vive en el repositorio.
export function matchesChain(name: string, chains: readonly string[]) {
  const key = ` ${placeKey(name)} `;
  return chains.some((chain) => chain && key.includes(` ${chain} `));
}

// Locales y propuestas pendientes de la misma ciudad con el mismo nombre o la
// misma dirección. La distancia en metros se calcula tras geocodificar
// (ADR 0006), no aquí.
async function findDuplicate(
  place: ProposedPlace,
): Promise<string | undefined> {
  const nameKey = placeKey(place.name);
  const streetKey = place.street ? placeKey(place.street) : undefined;
  const same = (other: { name: string; street?: string }) =>
    placeKey(other.name) === nameKey ||
    (streetKey !== undefined &&
      other.street !== undefined &&
      placeKey(other.street) === streetKey);

  const restaurants = await Restaurant.find(
    { cityKey: place.cityKey, status: { $in: ['published', 'pending'] } },
    { name: 1, 'address.street': 1 },
  )
    .limit(CANDIDATES)
    .lean<{ name: string; address?: { street?: string } }[]>();
  const restaurant = restaurants.find((r) =>
    same({ name: r.name, street: r.address?.street }),
  );
  if (restaurant) return restaurant.name;

  const suggestions = await Suggestion.find(
    {
      type: 'new',
      status: { $in: ['pending', 'info_requested'] },
      cityKey: place.cityKey,
    },
    { 'payload.name': 1, 'payload.street': 1 },
  )
    .limit(CANDIDATES)
    .lean<{ payload: { name: string; street?: string } }[]>();
  return suggestions.find((s) => same(s.payload))?.payload.name;
}

export interface WarningInput extends ProposedPlace {
  evidenceUrl?: string;
  chains: readonly string[];
}

// Filtro automático al crear una propuesta (docs/02_API_SPEC.md): solo deja
// avisos para quien modera; no rechaza nada.
export async function proposalWarnings(
  input: WarningInput,
): Promise<SuggestionWarning[]> {
  const warnings: SuggestionWarning[] = [];
  if (!input.evidenceUrl) warnings.push({ kind: 'noEvidence' });
  if (matchesChain(input.name, input.chains)) warnings.push({ kind: 'chain' });
  const other = await findDuplicate(input);
  if (other) warnings.push({ kind: 'duplicate', other });
  return warnings;
}
