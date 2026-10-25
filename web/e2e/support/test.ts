import { test as base, type Page, type Route } from '@playwright/test';
import { foodTags, restaurants } from '../fixtures/restaurants';
import type { Restaurant } from '../../src/lib/types';
import { suggestions } from '../fixtures/moderation';
import {
  auditLines,
  retired as retiredFixture,
  staff,
  type ApiStaff,
} from '../fixtures/staff';

export * from '@playwright/test';

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

// Cómo se llaman en cada idioma las ciudades que no se escriben igual en todos.
const cityNames: Record<string, { es: string; en: string }> = {
  東京: { es: 'Tokio', en: 'Tokyo' },
};

// GET /regions con los locales de e2e/fixtures: países y ciudades, por número
// de locales.
function regionsOf() {
  const cities = new Map<string, Restaurant[]>();
  for (const r of restaurants) {
    const key = `${r.address.country}/${normalize(r.address.city)}`;
    cities.set(key, [...(cities.get(key) ?? []), r]);
  }
  const box = (list: Restaurant[]) => ({
    west: Math.min(...list.map((r) => r.location.lng)),
    south: Math.min(...list.map((r) => r.location.lat)),
    east: Math.max(...list.map((r) => r.location.lng)),
    north: Math.max(...list.map((r) => r.location.lat)),
  });
  const countries = new Map<string, Restaurant[]>();
  for (const r of restaurants) {
    countries.set(r.address.country, [
      ...(countries.get(r.address.country) ?? []),
      r,
    ]);
  }
  return [...countries]
    .map(([code, list]) => ({
      code,
      count: list.length,
      bbox: box(list),
      cities: [...cities]
        .filter(([key]) => key.startsWith(`${code}/`))
        .map(([key, places]) => ({
          key: key.slice(code.length + 1),
          name: places[0]!.address.city,
          ...(cityNames[places[0]!.address.city] && {
            names: cityNames[places[0]!.address.city],
          }),
          count: places.length,
          bbox: box(places),
          center: {
            lat: places.reduce((n, r) => n + r.location.lat, 0) / places.length,
            lng: places.reduce((n, r) => n + r.location.lng, 0) / places.length,
          },
        }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.count - a.count);
}

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

// Ancho y alto de un WebP con pérdida (lo que codifica el navegador), para
// comprobar que la web reduce las fotos al tamaño acordado.
function webpSize(bytes: Buffer | null) {
  if (!bytes || bytes.toString('latin1', 8, 12) !== 'WEBP') return {};
  const chunk = bytes.toString('latin1', 12, 16);
  if (chunk === 'VP8X') {
    return {
      width: bytes.readUIntLE(24, 3) + 1,
      height: bytes.readUIntLE(27, 3) + 1,
    };
  }
  if (chunk !== 'VP8 ') return {};
  return {
    width: bytes.readUInt16LE(26) & 0x3fff,
    height: bytes.readUInt16LE(28) & 0x3fff,
  };
}

const PHOTO_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#e9d8c8"/></svg>';

// «Cerca de mí» desde el selector de lugar (también en la lista, sin mapa).
export async function chooseNearMe(page: Page) {
  await page.getByRole('button', { name: /Zona:/ }).click();
  await page
    .getByRole('dialog', { name: '¿Dónde?' })
    .getByRole('button', { name: 'Cerca de mí' })
    .click();
}

// Elegir un local en el buscador de los formularios: se escribe parte del
// nombre y se toca el resultado.
export async function choosePlace(
  page: Page,
  label: string,
  search: string,
  name: string,
) {
  await page.getByLabel(label, { exact: true }).fill(search);
  await page.getByRole('button', { name: new RegExp(name) }).click();
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

    let uploads = 0; // para dar una clave distinta a cada foto subida

    // Los locales de la prueba: sus fotos cambian con lo que haga Moderación.
    const places: Restaurant[] = structuredClone(restaurants);
    const photoRoute = /^\/restaurants\/([^/]+)\/photos(?:\/([^/]+))?$/;

    // Quién modera cambia con las altas y bajas de la propia prueba.
    const team: ApiStaff[] = structuredClone(staff);
    // Lo retirado cambia con las restauraciones de la propia prueba.
    const retired = structuredClone(retiredFixture);
    const denied = (route: Route) =>
      route.fulfill({
        status: 403,
        headers: cors(route),
        json: { error: { code: 'forbidden', message: 'Solo administración' } },
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
            'access-control-allow-methods': 'GET, POST, PUT, DELETE',
            'access-control-allow-headers': 'content-type, x-requested-with',
          },
        });
      }

      // Fotos de un local publicado (moderación).
      const photoCall = photoRoute.exec(path);
      if (photoCall && method !== 'GET') {
        const [, slug, file] = photoCall;
        const body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
        sent.push({ path, body });
        if (!session.role) {
          return route.fulfill({
            status: 401,
            headers,
            json: { error: { code: 'unauthorized', message: 'Sin sesión' } },
          });
        }
        const place = places.find((r) => r.slug === slug);
        if (!place) return route.fulfill({ status: 404, headers, json: {} });
        const photos = (place.photos ??= []);
        const at = photos.findIndex((p) => p.url.endsWith(`/${file}`));
        if (method === 'POST') {
          if (photos.length >= 12) {
            return route.fulfill({
              status: 422,
              headers,
              json: { error: { code: 'too_many_photos', message: 'Muchas' } },
            });
          }
          const id = String(body.photoKey).replace(/^q\/|\.webp$/g, '');
          const photo = {
            url: `${API}/photos/${id}.webp`,
            thumbUrl: `${API}/photos/${id}-thumb.webp`,
            ...(body.alt ? { alt: body.alt as Record<string, string> } : {}),
          };
          if (body.cover) photos.unshift(photo);
          else photos.push(photo);
          return route.fulfill({ status: 201, headers, json: photo });
        }
        if (at === -1) return route.fulfill({ status: 404, headers, json: {} });
        if (method === 'DELETE') photos.splice(at, 1);
        else {
          if (body.alt === null) delete photos[at]!.alt;
          else if (body.alt)
            photos[at]!.alt = body.alt as Record<string, string>;
          if (body.cover) photos.unshift(...photos.splice(at, 1));
        }
        return route.fulfill({ status: 204, headers });
      }

      if (method === 'DELETE') {
        sent.push({ path, body: {} });
        if (session.role !== 'admin') return denied(route);
        const member = team.find((m) => `/users/${m.id}` === path);
        if (!member) return route.fulfill({ status: 404, headers, json: {} });
        member.disabledAt ??= new Date().toISOString();
        return route.fulfill({ status: 204, headers });
      }

      if (method === 'POST' && path === '/uploads') {
        // La foto llega tal cual (no es JSON): se anota su tipo y su tamaño.
        const thumbOf = searchParams.get('thumbOf');
        sent.push({
          path: thumbOf ? `/uploads?thumbOf=${thumbOf}` : '/uploads',
          body: {
            type: request.headers()['content-type'],
            size: request.postDataBuffer()?.length ?? 0,
            ...webpSize(request.postDataBuffer()),
          },
        });
        const id =
          thumbOf ??
          `0b8e3a52-5a43-4b8a-9d5e-${String(++uploads).padStart(12, '0')}`;
        return route.fulfill({
          status: 201,
          headers,
          json: { key: `q/${id}${thumbOf ? '-thumb' : ''}.webp` },
        });
      }

      // Las fotos en cuarentena y las publicadas: una imagen cualquiera.
      if (
        method === 'GET' &&
        /^(\/suggestions\/[^/]+)?\/photos\/[^/]+$/.test(path)
      ) {
        return route.fulfill({
          headers,
          contentType: 'image/svg+xml',
          body: PHOTO_SVG,
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
        if (path === '/users') {
          if (session.role !== 'admin') return denied(route);
          const email = String(body.email);
          const found = team.find((m) => m.email === email);
          if (found && !found.disabledAt) {
            return route.fulfill({
              status: 409,
              headers,
              json: { error: { code: 'already_exists', message: 'Ya existe' } },
            });
          }
          const member: ApiStaff = {
            id: found?.id ?? `u${team.length + 1}`,
            email,
            role: 'moderator',
            moderationScope:
              body.moderationScope as ApiStaff['moderationScope'],
            createdAt: found?.createdAt ?? new Date().toISOString(),
          };
          team.splice(
            found ? team.indexOf(found) : team.length,
            found ? 1 : 0,
            member,
          );
          return route.fulfill({ status: 201, headers, json: member });
        }
        const restoreCall = /^\/retired\/listings\/([^/]+)\/restore$/.exec(
          path,
        );
        if (restoreCall) {
          if (session.role !== 'admin') return denied(route);
          const at = retired.listings.findIndex((l) => l.id === restoreCall[1]);
          if (at === -1 || restoreCall[1] === 'rl3') {
            return route.fulfill({
              status: 404,
              headers,
              json: { error: { code: 'not_found', message: 'Ya no está' } },
            });
          }
          retired.listings.splice(at, 1);
          return route.fulfill({ status: 204, headers });
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
      if (path === '/users') {
        if (session.role !== 'admin') return denied(route);
        return route.fulfill({ headers, json: { items: team } });
      }
      if (path === '/retired') {
        if (session.role !== 'admin') return denied(route);
        return route.fulfill({ headers, json: retired });
      }
      if (path === '/audit') {
        if (session.role !== 'admin') return denied(route);
        const entity = searchParams.get('entity');
        const lines = auditLines.filter((l) => !entity || l.entity === entity);
        // Páginas de tres: el cursor es el índice por donde seguir.
        const from = Number(searchParams.get('cursor') ?? 0);
        const items = lines.slice(from, from + 3);
        return route.fulfill({
          headers,
          json: {
            items,
            ...(from + 3 < lines.length
              ? { nextCursor: String(from + 3) }
              : {}),
          },
        });
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
        // Como la API: la cola no geocodifica, así que no trae el pin; el
        // detalle sí (pin, de dónde viene y avisos de duplicado).
        return route.fulfill({
          headers,
          json: {
            items: suggestions
              .filter((s) => wanted.includes(s.status))
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              .map(({ location, locationBy, ...item }) => item),
          },
        });
      }

      if (path === '/regions') {
        return route.fulfill({ headers, json: { countries: regionsOf() } });
      }
      if (path === '/restaurants') {
        // Como la API: por país y ciudad o por rectángulo, sin el equipo
        // (docs/02_API_SPEC.md).
        const country = searchParams.get('country');
        const city = searchParams.get('city');
        const q = normalize(searchParams.get('q') ?? '');
        const box = searchParams.get('bbox')?.split(',').map(Number);
        const inside = (r: Restaurant) => {
          if (!box) return true;
          const [west, south, east, north] = box as [
            number,
            number,
            number,
            number,
          ];
          return (
            r.location.lat >= south &&
            r.location.lat <= north &&
            (west <= east
              ? r.location.lng >= west && r.location.lng <= east
              : r.location.lng >= west || r.location.lng <= east)
          );
        };
        const items = places
          .filter(
            (r) =>
              (!country || r.address.country === country) &&
              (!q || normalize(r.name).includes(q)) &&
              (!city || normalize(r.address.city) === normalize(city)) &&
              inside(r),
          )
          .map(({ team, ...rest }) => {
            void team;
            return rest;
          });
        return route.fulfill({ headers, json: { items } });
      }
      if (path === '/meta/filters') {
        return route.fulfill({ headers, json: { foodTags } });
      }
      const slug = /^\/restaurants\/([^/]+)$/.exec(path)?.[1];
      const found = places.find((r) => r.slug === slug);
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
