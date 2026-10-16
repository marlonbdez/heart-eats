// Cliente de la API (docs/02_API_SPEC.md). La dirección se fija al compilar:
// en local es el servidor de `server/`; en producción, api.hearteats.org.
const base = (
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
).replace(/\/+$/, '');

export const apiBase = `${base}/api/v1`;

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

type Params = Record<string, string | number | undefined>;

// Lectura pública (sin sesión ni cookies).
export async function apiGet<T>(path: string, params: Params = {}) {
  const url = new URL(`${apiBase}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new ApiRequestError(res.status, `La API respondió ${res.status}`);
  }
  return (await res.json()) as T;
}
