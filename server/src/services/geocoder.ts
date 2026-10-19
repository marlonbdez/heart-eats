// Geocodificación de las direcciones de los locales propuestos (ADR 0006).
// Las rutas solo conocen esta interfaz: el servicio se cambia sin tocarlas.
export interface GeocodeQuery {
  street: string;
  postalCode?: string;
  city: string;
  // Limita la búsqueda a ese país (ISO 3166-1 alfa-2).
  country?: string;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  country?: string; // ISO 3166-1 alfa-2
}

export interface Geocoder {
  // `null` si el servicio no encuentra la dirección; lanza si no responde.
  geocode(query: GeocodeQuery): Promise<GeocodeResult | null>;
  // Cómo se llama una ciudad en cada idioma ({ es: 'Tokio', en: 'Tokyo' }).
  // Solo salen los idiomas en que el servicio la encuentra; lanza si no responde.
  cityNames(
    query: { city: string; country: string },
    locales: readonly string[],
  ): Promise<Record<string, string>>;
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
  address?: {
    country_code?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
  };
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

  // Una petición a /search, respetando el ritmo. Solo el estado va al
  // registro: ni lo buscado ni la respuesta.
  async function fetchPlaces(
    params: Record<string, string>,
    language?: string,
  ): Promise<NominatimPlace[]> {
    const wait = lastRequestAt + minIntervalMs - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();

    const url = `${baseUrl}/search?${new URLSearchParams({
      format: 'jsonv2',
      addressdetails: '1',
      limit: '1',
      ...params,
    })}`;
    const res = await fetchFn(url, {
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json',
        ...(language ? { 'Accept-Language': language } : {}),
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`Nominatim respondió ${res.status}`);
    return (await res.json()) as NominatimPlace[];
  }

  async function search(query: GeocodeQuery): Promise<GeocodeResult | null> {
    const [place] = await fetchPlaces({
      q: [
        query.street,
        [query.postalCode, query.city].filter(Boolean).join(' '),
      ]
        .filter(Boolean)
        .join(', '),
      ...(query.country ? { countrycodes: query.country.toLowerCase() } : {}),
    });
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

  async function names(
    query: { city: string; country: string },
    locales: readonly string[],
  ): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    for (const locale of locales) {
      const [place] = await fetchPlaces(
        { city: query.city, countrycodes: query.country.toLowerCase() },
        locale,
      );
      const { city, town, village, municipality } = place?.address ?? {};
      const name = city ?? town ?? village ?? municipality;
      if (name) result[locale] = name;
    }
    return result;
  }

  // Las peticiones salen de una en una; un fallo no frena la cola.
  const enqueue = <T>(job: () => Promise<T>): Promise<T> => {
    const result = queue.then(job);
    queue = result.catch(() => undefined);
    return result;
  };

  return {
    geocode: (query) => enqueue(() => search(query)),
    cityNames: (query, locales) => enqueue(() => names(query, locales)),
  };
}
