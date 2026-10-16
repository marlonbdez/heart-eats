import { test as base } from '@playwright/test';
import { foodTags, restaurants } from '../fixtures/restaurants';

export * from '@playwright/test';

// La web pide los datos a la API desde el navegador (por defecto, en
// localhost:3001). En las pruebas no hay servidor: cada página responde con
// los datos de e2e/fixtures. Una prueba puede registrar su propia ruta para
// simular una base vacía o un fallo (la última registrada manda).
export const API = 'http://localhost:3001/api/v1';

const cors = { 'access-control-allow-origin': '*' };

// Lo que la web ha enviado a la API en esta prueba (envíos de la comunidad).
export interface Sent {
  path: string;
  body: Record<string, unknown>;
}

export const test = base.extend<{ sent: Sent[] }>({
  sent: async ({}, provide) => {
    await provide([]);
  },
  page: async ({ page, sent }, provide) => {
    await page.route(`${API}/**`, async (route) => {
      const { pathname } = new URL(route.request().url());
      const path = pathname.replace('/api/v1', '');

      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({
          status: 204,
          headers: {
            ...cors,
            'access-control-allow-methods': 'GET, POST',
            'access-control-allow-headers': 'content-type',
          },
        });
      }
      if (route.request().method() === 'POST') {
        sent.push({
          path,
          body: route.request().postDataJSON() as Record<string, unknown>,
        });
        return route.fulfill({
          status: 202,
          headers: cors,
          json: { id: '65f000000000000000000001', status: 'pending' },
        });
      }

      if (path === '/restaurants') {
        // La lista no lleva el equipo (docs/02_API_SPEC.md).
        const items = restaurants.map(({ team, ...rest }) => {
          void team;
          return rest;
        });
        return route.fulfill({ headers: cors, json: { items } });
      }
      if (path === '/meta/filters') {
        return route.fulfill({ headers: cors, json: { foodTags } });
      }
      const slug = /^\/restaurants\/([^/]+)$/.exec(path)?.[1];
      const found = restaurants.find((r) => r.slug === slug);
      if (found) return route.fulfill({ headers: cors, json: found });
      return route.fulfill({
        status: 404,
        headers: cors,
        json: { error: { code: 'not_found', message: 'No encontrado' } },
      });
    });
    await provide(page);
  },
});
