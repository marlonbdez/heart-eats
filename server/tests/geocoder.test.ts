import { describe, expect, it, vi } from 'vitest';
import { nominatimGeocoder } from '../src/services/geocoder.js';

const query = { street: 'Calle Mayor 5', postalCode: '28013', city: 'Madrid' };
const base = { baseUrl: 'https://nominatim.test', userAgent: 'HeartEats test' };

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

describe('nominatimGeocoder', () => {
  it('pide la dirección con el User-Agent del proyecto y lee el pin', async () => {
    const fetchFn = vi.fn(async () =>
      reply([
        { lat: '40.4155', lon: '-3.7074', address: { country_code: 'es' } },
      ]),
    );
    const geocoder = nominatimGeocoder({ ...base, fetchFn, minIntervalMs: 0 });

    expect(await geocoder.geocode(query)).toEqual({
      lat: 40.4155,
      lng: -3.7074,
      country: 'ES',
    });
    const [url, init] = fetchFn.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const params = new URL(url).searchParams;
    expect(params.get('q')).toBe('Calle Mayor 5, 28013 Madrid');
    expect(params.get('limit')).toBe('1');
    expect(init.headers).toMatchObject({ 'User-Agent': 'HeartEats test' });
  });

  it.each([
    ['sin resultados', []],
    ['coordenadas que no son números', [{ lat: 'x', lon: 'y' }]],
    ['coordenadas fuera de rango', [{ lat: '95', lon: '10' }]],
  ])('%s: null', async (_name, body) => {
    const geocoder = nominatimGeocoder({
      ...base,
      fetchFn: async () => reply(body),
      minIntervalMs: 0,
    });
    expect(await geocoder.geocode(query)).toBeNull();
  });

  it('si no responde bien, lanza sin repetir la dirección', async () => {
    const geocoder = nominatimGeocoder({
      ...base,
      fetchFn: async () => reply({}, 503),
      minIntervalMs: 0,
    });
    const error = await geocoder.geocode(query).catch((e: Error) => e);
    expect((error as Error).message).toBe('Nominatim respondió 503');
  });

  it('separa las peticiones al menos un segundo y las atiende de una en una', async () => {
    let now = 10_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const sleeps: number[] = [];
    let inFlight = 0;
    let maxInFlight = 0;
    const geocoder = nominatimGeocoder({
      ...base,
      sleep: async (ms) => {
        sleeps.push(ms);
        now += ms;
      },
      fetchFn: async () => {
        maxInFlight = Math.max(maxInFlight, ++inFlight);
        await Promise.resolve();
        inFlight--;
        return reply([]);
      },
    });

    await Promise.all([
      geocoder.geocode(query),
      geocoder.geocode(query),
      geocoder.geocode(query),
    ]);
    vi.restoreAllMocks();

    expect(maxInFlight).toBe(1);
    expect(sleeps).toEqual([1000, 1000]); // la primera sale al momento
  });

  it('un fallo no bloquea las siguientes peticiones', async () => {
    let calls = 0;
    const geocoder = nominatimGeocoder({
      ...base,
      minIntervalMs: 0,
      fetchFn: async () => (++calls === 1 ? reply({}, 500) : reply([])),
    });
    await expect(geocoder.geocode(query)).rejects.toThrow();
    expect(await geocoder.geocode(query)).toBeNull();
  });
});
