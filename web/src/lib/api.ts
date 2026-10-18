// Cliente de la API (docs/02_API_SPEC.md). La dirección se fija al compilar:
// en local es el servidor de `server/`; en producción, api.hearteats.org.
const base = (
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
).replace(/\/+$/, '');

export const apiBase = `${base}/api/v1`;

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    // El `error.code` de la API (`conflict`, `geocoding_required`…), si lo hay.
    readonly code: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

type Params = Record<string, string | number | undefined>;

async function request(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  {
    params = {},
    body,
    session = false,
    signal,
  }: {
    params?: Params;
    body?: unknown;
    // Para cancelar una lectura que ya no hace falta.
    signal?: AbortSignal;
    // Con sesión de moderación: lleva la cookie y, al escribir, la cabecera
    // que exige el servidor (ADR 0007).
    session?: boolean;
  } = {},
) {
  const url = new URL(`${apiBase}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (session && method !== 'GET') headers['X-Requested-With'] = 'fetch';

  const res = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: session ? 'include' : 'omit',
    signal,
  });
  if (!res.ok) {
    const error = (await res.json().catch(() => null)) as {
      error?: { code?: string };
    } | null;
    throw new ApiRequestError(
      res.status,
      error?.error?.code,
      `La API respondió ${res.status}`,
    );
  }
  return res;
}

// Lectura pública (sin sesión ni cookies).
export async function apiGet<T>(
  path: string,
  params: Params = {},
  signal?: AbortSignal,
) {
  return (await (await request('GET', path, { params, signal })).json()) as T;
}

// Envío de la comunidad (sin cuenta ni cookies): JSON y, si va bien, 202.
export async function apiPost(path: string, body: unknown) {
  await request('POST', path, { body });
}

// Moderación: con la cookie de sesión.
export async function sessionGet<T>(path: string, params: Params = {}) {
  const res = await request('GET', path, { params, session: true });
  return (await res.json()) as T;
}

export async function sessionPost<T = void>(path: string, body?: unknown) {
  const res = await request('POST', path, { body, session: true });
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export async function sessionDelete(path: string) {
  await request('DELETE', path, { session: true });
}

// Demasiados envíos desde esta conexión (429): se avisa distinto que un fallo.
export const isRateLimited = (err: unknown) =>
  err instanceof ApiRequestError && err.status === 429;
