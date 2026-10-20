import { API, expect, test } from './support/test';
import type { Page } from '@playwright/test';

const markers = (page: Page) => page.locator('[data-marker]');
const marker = (page: Page, slug: string) =>
  page.locator(`[data-marker="${slug}"]`);

// Aleja el mapa con el botón del zoom (un gesto de la persona) hasta que
// aparece el marcador.
async function zoomOutUntil(page: Page, slug: string) {
  const zoomOut = page.locator('.maplibregl-ctrl-zoom-out');
  for (let i = 0; i < 5; i++) {
    await zoomOut.click();
    await page.waitForTimeout(150);
  }
  await expect(async () => {
    await zoomOut.click();
    await expect(marker(page, slug)).toBeAttached({ timeout: 800 });
  }).toPass({ timeout: 25_000 });
}

const cors = { 'access-control-allow-origin': '*' };

test.describe('mapa por área visible', () => {
  test('al alejar el mapa salen los locales de otras ciudades', async ({
    page,
  }) => {
    await page.goto('/es/map');
    await expect(markers(page)).toHaveCount(6);
    await expect(marker(page, 'demo-cafe-del-mar')).toHaveCount(0);

    const bboxRequest = page.waitForRequest(
      (r) => r.url().includes('/restaurants?') && r.url().includes('bbox='),
    );
    await zoomOutUntil(page, 'demo-cafe-del-mar');
    await bboxRequest;

    // Madrid y Barcelona se ven; Tokio queda lejos.
    await expect(markers(page)).toHaveCount(8);
    await expect(marker(page, 'demo-sakura-shokudo')).toHaveCount(0);
  });

  test('elegir una zona descarta lo explorado, también la que ya era la actual', async ({
    page,
  }) => {
    await page.goto('/es/map');
    await expect(markers(page)).toHaveCount(6);
    await zoomOutUntil(page, 'demo-cafe-del-mar');
    await expect(markers(page)).toHaveCount(8);

    await page.getByRole('button', { name: /Zona: / }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /Madrid/ })
      .click();
    await expect(markers(page)).toHaveCount(6);
    await expect(marker(page, 'demo-cafe-del-mar')).toHaveCount(0);
  });

  test('con una búsqueda se busca en toda la zona y, al borrarla, se vuelve a ella', async ({
    page,
  }) => {
    await page.goto('/es/map');
    await expect(markers(page)).toHaveCount(6);
    await zoomOutUntil(page, 'demo-cafe-del-mar');
    await expect(markers(page)).toHaveCount(8);

    await page.getByRole('searchbox').fill('masa madre');
    await expect(markers(page)).toHaveCount(1);
    await page.getByRole('searchbox').fill('');
    await expect(markers(page)).toHaveCount(6);
  });

  test('si hay más de los que caben, pide acercar el mapa', async ({
    page,
  }) => {
    await page.route(`${API}/restaurants?*bbox=*`, (route) =>
      route.fulfill({
        headers: cors,
        json: { items: [], nextCursor: 'mas' },
      }),
    );
    await page.goto('/es/map');
    await expect(markers(page)).toHaveCount(6);
    await page.locator('.maplibregl-ctrl-zoom-out').click();
    await expect(
      page.getByText('Hay más locales aquí. Acerca el mapa para verlos todos.'),
    ).toBeVisible();
  });

  test('si en esa parte del mapa no hay locales, lo dice', async ({ page }) => {
    await page.route(`${API}/restaurants?*bbox=*`, (route) =>
      route.fulfill({ headers: cors, json: { items: [] } }),
    );
    await page.goto('/es/map');
    await expect(markers(page)).toHaveCount(6);
    await page.locator('.maplibregl-ctrl-zoom-out').click();
    await expect(
      page.getByText('No hay locales publicados en esta parte del mapa.'),
    ).toBeVisible();
  });

  test('si falla al cargar, avisa, conserva lo que había y deja reintentar', async ({
    page,
  }) => {
    let failing = true;
    await page.route(`${API}/restaurants?*bbox=*`, (route) =>
      failing
        ? route.fulfill({
            status: 500,
            headers: cors,
            json: { error: { code: 'internal', message: 'Fallo' } },
          })
        : route.fallback(),
    );
    await page.goto('/es/map');
    await expect(markers(page)).toHaveCount(6);
    await page.locator('.maplibregl-ctrl-zoom-out').click();

    const alert = page
      .getByRole('alert')
      .filter({ has: page.getByRole('button', { name: 'Reintentar' }) });
    await expect(alert).toBeVisible();
    await expect(markers(page)).toHaveCount(6);

    failing = false;
    await alert.getByRole('button', { name: 'Reintentar' }).click();
    await expect(alert).toHaveCount(0);
  });
});
