import { test as base, type Route } from '@playwright/test';
import { foodTags, restaurants } from '../fixtures/restaurants';
import { suggestions } from '../fixtures/moderation';

export * from '@playwright/test';

// La web pide los datos a la API desde el navegador (por defecto, en
// localhost:3001). En las pruebas no hay servidor: cada página responde con
// los datos de e2e/fixtures. Una prueba puede registrar su propia ruta para
// simular una base vacía o un fallo (la última registrada manda).
export const API = 'http://localhost:3001/api/v1';

// Lo que la web ha enviado a la API en esta prueba (envíos y decisiones).
export interface Sent {
  path: string;
  body: Record<string, unknown>;
}

export type Staff = 'moderator' | 'admin' | null;

// Quién tiene la sesión abierta en la API simulada. Una prueba de moderación
// lo pone a `moderator` o `admin` antes de abrir la pantalla.
export interface Session {
  role: Staff;
}

export const test = base.extend<{ sent: Sent[]; session: Session }>({
  sent: async ({}, provide) => {
    await provide([]);
  },
  session: async ({}, provide) => {
    await provide({ role: null });
  },
  page: async ({ page, sent, session }, provide) => {
    // La cookie de sesión exige un origen concreto y credenciales permitidas.
    const cors = (route: Route) => ({
      'access-control-allow-origin': route.request().headers()['origin'] ?? '*',
      'access-control-allow-credentials': 'true',
    });
    const me = () => ({
      email: 'moderacion@ejemplo.org',
      role: session.role,
      moderationScope: [{ country: 'ES' }],
    });

    await page.route(`${API}/**`, async (route) => {
      const request = route.request();
      const { pathname, searchParams } = new URL(request.url());
      const path = pathname.replace('/api/v1', '');
      const method = request.method();
      const headers = cors(route);

      if (method === 'OPTIONS') {
        return route.fulfill({
          status: 204,
          headers: {
            ...headers,
            'access-control-allow-methods': 'GET, POST, DELETE',
            'access-control-allow-headers': 'content-type, x-requested-with',
          },
        });
      }

      if (method === 'POST') {
        const body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
        sent.push({ path, body });
        if (path === '/auth/session') {
          if (body.token !== 'good') {
            return route.fulfill({
              status: 401,
              headers,
              json: { error: { code: 'invalid_token', message: 'Caducado' } },
            });
          }
          session.role ??= 'moderator';
          return route.fulfill({ headers, json: me() });
        }
        const replyToken = /^\/replies\/([^/]+)$/.exec(path)?.[1];
        if (replyToken) {
          if (replyToken === 'busy') {
            return route.fulfill({
              status: 429,
              headers,
              json: { error: { code: 'rate_limited', message: 'Muchas' } },
            });
          }
          if (replyToken !== 'good') {
            return route.fulfill({
              status: 404,
              headers,
              json: { error: { code: 'not_found', message: 'Ya no vale' } },
            });
          }
          return route.fulfill({
            status: 201,
            headers,
            json: { status: 'received' },
          });
        }
        if (path === '/auth/logout') {
          session.role = null;
          return route.fulfill({ status: 204, headers });
        }
        if (/^\/suggestions\/[^/]+\/decision$/.test(path)) {
          return route.fulfill({ headers, json: { status: 'ok' } });
        }
        return route.fulfill({
          status: 202,
          headers,
          json: { id: '65f000000000000000000001', status: 'pending' },
        });
      }

      const replyToken = /^\/replies\/([^/]+)$/.exec(path)?.[1];
      if (replyToken) {
        if (!['good', 'busy'].includes(replyToken)) {
          return route.fulfill({
            status: 404,
            headers,
            json: { error: { code: 'not_found', message: 'Ya no vale' } },
          });
        }
        return route.fulfill({
          headers,
          json: {
            name: '[DEMO] Café Nuevo',
            note: '¿Puedes decirnos si el local tiene rampa en la entrada?',
            deadline: '2026-11-20T10:00:00.000Z',
            locale: 'es',
          },
        });
      }
      if (path === '/auth/me') {
        if (!session.role) {
          return route.fulfill({
            status: 401,
            headers,
            json: { error: { code: 'unauthorized', message: 'Sin sesión' } },
          });
        }
        return route.fulfill({ headers, json: me() });
      }
      if (path === '/suggestions' || path.startsWith('/suggestions/')) {
        if (!session.role) {
          return route.fulfill({
            status: 401,
            headers,
            json: { error: { code: 'unauthorized', message: 'Sin sesión' } },
          });
        }
        const status = searchParams.get('status') ?? 'pending';
        const wanted =
          status === 'resolved' ? ['approved', 'rejected'] : [status];
        const id = path.split('/')[2];
        if (id) {
          const found = suggestions.find((s) => s.id === id);
          return found
            ? route.fulfill({ headers, json: found })
            : route.fulfill({ status: 404, headers, json: {} });
        }
        return route.fulfill({
          headers,
          json: { items: suggestions.filter((s) => wanted.includes(s.status)) },
        });
      }

      if (path === '/restaurants') {
        // La lista no lleva el equipo (docs/02_API_SPEC.md).
        const items = restaurants.map(({ team, ...rest }) => {
          void team;
          return rest;
        });
        return route.fulfill({ headers, json: { items } });
      }
      if (path === '/meta/filters') {
        return route.fulfill({ headers, json: { foodTags } });
      }
      const slug = /^\/restaurants\/([^/]+)$/.exec(path)?.[1];
      const found = restaurants.find((r) => r.slug === slug);
      if (found) return route.fulfill({ headers, json: found });
      return route.fulfill({
        status: 404,
        headers,
        json: { error: { code: 'not_found', message: 'No encontrado' } },
      });
    });
    await provide(page);
  },
});
