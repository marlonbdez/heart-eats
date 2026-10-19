import { Restaurant } from '../models/restaurant.js';
import {
  Suggestion,
  type SuggestionRecord,
  type SuggestionWarning,
} from '../models/suggestion.js';
import type { Geocoder } from './geocoder.js';

// Un local a menos de esto se avisa como posible duplicado.
const NEARBY_METERS = 50;

interface ProposedAddress {
  street?: string;
  postalCode?: string;
  city: string;
  country?: string;
  // Pin que colocó quien propone en el mapa.
  location?: { lat: number; lng: number };
}

// Locales cercanos al pin, del más próximo al más lejano.
async function nearbyPlaces(lat: number, lng: number) {
  return Restaurant.aggregate<{ name: string; meters: number }>([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'meters',
        maxDistance: NEARBY_METERS,
        spherical: true,
        query: { status: { $in: ['published', 'pending'] } },
      },
    },
    { $limit: 3 },
    { $project: { _id: 0, name: 1, meters: 1 } },
  ]);
}

// Añade la distancia al aviso de duplicado que ya nombra ese local, o crea uno.
export function withDistances(
  warnings: readonly SuggestionWarning[],
  places: readonly { name: string; meters: number }[],
): SuggestionWarning[] {
  const result = [...warnings];
  for (const { name, meters } of places) {
    const rounded = Math.round(meters);
    const i = result.findIndex(
      (w) => w.kind === 'duplicate' && w.other === name,
    );
    if (i >= 0) result[i] = { kind: 'duplicate', other: name, meters: rounded };
    else result.push({ kind: 'duplicate', other: name, meters: rounded });
  }
  return result;
}

// La primera vez que Moderación abre un local nuevo se coloca su pin y se
// guarda en la solicitud (ADR 0006); no se vuelve a pedir. Si quien propone lo
// puso en el mapa, ese es el pin y no se consulta nada. Si no, se geocodifica
// la dirección, dentro de su país si lo dio. Sin calle no se geocodifica:
// sería el centro de la ciudad, no el local. Si el servicio falla, la
// solicitud sigue siendo revisable sin pin y se reintenta en la próxima
// apertura.
export async function ensureGeocode(
  record: SuggestionRecord,
  geocoder: Geocoder | undefined,
): Promise<SuggestionRecord> {
  if (record.type !== 'new' || record.geocode) return record;
  if (record.status !== 'pending' && record.status !== 'info_requested') {
    return record;
  }
  const address = record.payload as unknown as ProposedAddress;

  let result;
  let provider = 'nominatim';
  if (address.location) {
    provider = 'proposer';
    result = {
      ...address.location,
      ...(address.country ? { country: address.country } : {}),
    };
  } else {
    if (!geocoder || !address.street) return record;
    try {
      result = await geocoder.geocode({
        street: address.street,
        postalCode: address.postalCode,
        city: address.city,
        country: address.country,
      });
    } catch (err) {
      console.error(
        'No se pudo geocodificar:',
        err instanceof Error ? err.message : err,
      );
      return record;
    }
  }

  const geocode = { provider, at: new Date(), ...result };
  const warnings = result
    ? withDistances(record.warnings, await nearbyPlaces(result.lat, result.lng))
    : record.warnings;
  // Si otra apertura se adelantó, vale su resultado.
  const saved = await Suggestion.findOneAndUpdate(
    { _id: record._id, geocode: { $exists: false } },
    { $set: { geocode, warnings } },
    { returnDocument: 'after' },
  ).lean<SuggestionRecord>();
  return (
    saved ??
    (await Suggestion.findById(record._id).lean<SuggestionRecord>()) ??
    record
  );
}
