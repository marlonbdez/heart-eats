// Geocodificación de las direcciones de los locales propuestos (ADR 0006).
// Las rutas solo conocen esta interfaz: el servicio se cambia sin tocarlas.
export interface GeocodeQuery {
  street: string;
  postalCode?: string;
  city: string;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  country?: string; // ISO 3166-1 alfa-2
}

export interface Geocoder {
  // `null` si el servicio no encuentra la dirección; lanza si no responde.
  geocode(query: GeocodeQuery): Promise<GeocodeResult | null>;
}

interface NominatimOptions {
  baseUrl: string;
  // Identifica el proyecto y un contacto, como exigen sus condiciones de uso.
  userAgent: string;
  // Condiciones de uso: como mucho una petición por segundo.
  minIntervalMs?: number;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

interface NominatimPlace {
  lat?: string;
  lon?: string;
  address?: { country_code?: string };
}

// Nominatim, la instancia pública de OpenStreetMap. Las peticiones salen de
// una en una, separadas al menos `minIntervalMs`.
export function nominatimGeocoder({
  baseUrl,
  userAgent,
  minIntervalMs = 1000,
  timeoutMs = 5000,
  fetchFn = fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}: NominatimOptions): Geocoder {
  let queue: Promise<unknown> = Promise.resolve();
  let lastRequestAt = 0;

  async function search(query: GeocodeQuery): Promise<GeocodeResult | null> {
    const wait = lastRequestAt + minIntervalMs - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();

    const params = new URLSearchParams({
      q: [
        query.street,
        [query.postalCode, query.city].filter(Boolean).join(' '),
      ]
        .filter(Boolean)
        .join(', '),
      format: 'jsonv2',
      addressdetails: '1',
      limit: '1',
    });
    const res = await fetchFn(`${baseUrl}/search?${params}`, {
      headers: { 'User-Agent': userAgent, Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    // Solo el estado: ni la dirección buscada ni la respuesta van al registro.
    if (!res.ok) throw new Error(`Nominatim respondió ${res.status}`);

    const [place] = (await res.json()) as NominatimPlace[];
    const lat = Number(place?.lat);
    const lng = Number(place?.lon);
    if (
      !place ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    ) {
      return null;
    }
    const country = place.address?.country_code?.toUpperCase();
    return { lat, lng, ...(country?.length === 2 ? { country } : {}) };
  }

  return {
    geocode(query) {
      const result = queue.then(() => search(query));
      queue = result.catch(() => undefined); // un fallo no frena la cola
      return result;
    },
  };
}
