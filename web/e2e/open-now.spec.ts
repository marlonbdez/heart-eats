import { restaurants } from './fixtures/restaurants';
import { expect, test } from './support/test';
import type { Page } from '@playwright/test';

// El 26 de octubre de 2026 (lunes) Madrid va en hora de invierno (UTC+1) y
// Tokio en UTC+9. «La Masa Madre» abre de martes a domingo, de 13:00 a 23:30.
const MASA = '/es/place/demo-la-masa-madre';
const masa = restaurants.find((r) => r.slug === 'demo-la-masa-madre')!;
const isMasa = (url: URL) => url.pathname.endsWith(`/restaurants/${masa.slug}`);

async function at(page: Page, iso: string, path = MASA) {
  await page.clock.install({ time: new Date(iso) });
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

const status = (page: Page) =>
  page.locator('header p', {
    hasText: /Abierto|Cierra|Cerrado|Closed|Open|Closing/,
  });

test('abierto: dice hasta cuándo, en la hora del local', async ({ page }) => {
  await at(page, '2026-10-27T12:30:00Z'); // martes 13:30 en Madrid
  await expect(status(page)).toHaveText('Abierto ahora · hasta las 23:30');
});

test('a menos de una hora de cerrar, avisa de que cierra pronto', async ({
  page,
}) => {
  await at(page, '2026-10-27T22:00:00Z'); // martes 23:00
  await expect(status(page)).toHaveText('Cierra pronto · a las 23:30');
});

test('cerrado: dice cuándo abre (hoy, mañana o el día que toque)', async ({
  page,
}) => {
  await at(page, '2026-10-27T10:00:00Z'); // martes 11:00: abre hoy
  await expect(status(page)).toHaveText('Cerrado ahora · abre hoy a las 13:00');

  await page.clock.setFixedTime(new Date('2026-10-27T22:30:00Z')); // 23:30 justo
  await page.reload();
  await expect(status(page)).toHaveText(
    'Cerrado ahora · abre mañana a las 13:00',
  );

  await page.clock.setFixedTime(new Date('2026-10-26T12:00:00Z')); // lunes cerrado
  await page.reload();
  await expect(status(page)).toHaveText(
    'Cerrado ahora · abre mañana a las 13:00',
  );
});

test('la hora es la del local y no la de quien mira', async ({ page }) => {
  // Mismo instante: la tarde del martes en Madrid y la noche en Tokio.
  const instant = '2026-10-27T12:30:00Z';
  await at(page, instant);
  await expect(status(page)).toHaveText('Abierto ahora · hasta las 23:30');

  await page.goto('/es/place/demo-sakura-shokudo'); // martes 21:30 en Tokio
  await expect(status(page)).toHaveText(
    'Cerrado ahora · abre mañana a las 09:00',
  );
});

test('un cierre pasada la medianoche cuenta como del día siguiente', async ({
  page,
}) => {
  await page.route(isMasa, (route) =>
    route.fulfill({
      headers: { 'access-control-allow-origin': '*' },
      json: {
        ...masa,
        openingHours: [{ day: 2, open: '20:00', close: '02:00' }],
      },
    }),
  );
  // Abre el martes a las 20:00; el miércoles a las 00:30 sigue abierto (y a la
  // 01:30 ya cierra pronto); a las 03:00 ya no.
  await at(page, '2026-10-27T23:30:00Z'); // miércoles 00:30 en Madrid
  await expect(status(page)).toHaveText('Abierto ahora · hasta las 02:00');
  await page.clock.setFixedTime(new Date('2026-10-28T00:30:00Z')); // 01:30
  await page.reload();
  await expect(status(page)).toHaveText('Cierra pronto · a las 02:00');
  await page.clock.setFixedTime(new Date('2026-10-28T02:00:00Z')); // 03:00
  await page.reload();
  await expect(status(page)).toHaveText(
    'Cerrado ahora · abre el martes a las 20:00',
  );
});

test('sin zona horaria no se adivina nada', async ({ page }) => {
  await page.route(isMasa, (route) =>
    route.fulfill({
      headers: { 'access-control-allow-origin': '*' },
      json: { ...masa, timezone: undefined },
    }),
  );
  await at(page, '2026-10-27T12:30:00Z');
  await expect(status(page)).toHaveCount(0);
});

test('en inglés', async ({ page }) => {
  await at(page, '2026-10-27T12:30:00Z', '/en/place/demo-la-masa-madre');
  await expect(status(page)).toHaveText('Open now · until 23:30');
});

test('el sello va dentro del bloque del equipo, con la proporción', async ({
  page,
}) => {
  await page.goto(MASA);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const team = page.locator('section[aria-labelledby="equipo"]');
  await expect(team).toContainText('Negocio con equipo inclusivo');
  // Una sola vez en la página: ya no se repite bajo el nombre.
  await expect(page.getByText('Negocio con equipo inclusivo')).toHaveCount(1);
});
