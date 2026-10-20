import { expect, test } from './support/test';
import type { Page } from '@playwright/test';

// En pantallas anchas (≥ 900 px) lista y mapa se ven a la vez.
test.use({
  isMobile: false,
  hasTouch: false,
  deviceScaleFactor: 1,
  viewport: { width: 1280, height: 800 },
});

const markers = (page: Page) => page.locator('[data-marker]');
const list = (page: Page) =>
  page.getByRole('list', { name: 'Lista de locales' });
const cards = (page: Page) => list(page).getByRole('listitem');

for (const path of ['/es', '/es/list']) {
  test(`${path}: las tarjetas a la izquierda y el mapa a la derecha`, async ({
    page,
  }) => {
    await page.goto(path);
    await expect(markers(page)).toHaveCount(6);
    await expect(cards(page)).toHaveCount(6);
    const listBox = (await list(page).boundingBox())!;
    const mapBox = (await page
      .getByRole('region', { name: 'Mapa de locales' })
      .boundingBox())!;
    expect(listBox.x + listBox.width).toBeLessThanOrEqual(mapBox.x + 1);
    // El mapa ocupa todo el alto disponible, bajo los filtros.
    expect(mapBox.height).toBeGreaterThan(400);
    // Ya se ve todo a la vez: no hace falta el conmutador.
    await expect(page.getByRole('navigation', { name: 'Vista' })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole('status').filter({ hasText: '6 locales' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Cerca de mí' }),
    ).toBeVisible();
  });
}

test('desde 900 px se parte la pantalla; por debajo, una vista cada vez', async ({
  page,
}) => {
  await page.setViewportSize({ width: 899, height: 800 });
  await page.goto('/es');
  await expect(markers(page)).toHaveCount(6);
  await expect(list(page)).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Vista' })).toBeVisible();

  await page.setViewportSize({ width: 900, height: 800 });
  await expect(cards(page)).toHaveCount(6);
  await expect(markers(page)).toHaveCount(6);
  await expect(page.getByRole('navigation', { name: 'Vista' })).toHaveCount(0);

  await page.setViewportSize({ width: 800, height: 800 });
  await expect(list(page)).toHaveCount(0);
  await expect(markers(page)).toHaveCount(6);
});

test('tocar un pin marca su tarjeta y la lleva a la vista, sin globo', async ({
  page,
}) => {
  await page.goto('/es');
  await expect(cards(page)).toHaveCount(6);
  const last = cards(page).last();
  await expect(last).not.toBeInViewport();

  const slug = await last.getAttribute('data-slug');
  await page.locator(`[data-marker="${slug}"]`).click();
  await expect(last).toHaveAttribute('data-selected', 'true');
  await expect(last).toBeInViewport();
  await expect(cards(page).first()).toHaveAttribute('data-selected', 'false');
  // La tarjeta ya está en la lista: no sale la vista previa flotante.
  await expect(page.getByRole('complementary')).toHaveCount(0);

  // Un clic en el fondo del mapa la desmarca.
  await page
    .getByRole('region', { name: 'Mapa de locales' })
    .click({ position: { x: 5, y: 400 } });
  await expect(last).toHaveAttribute('data-selected', 'false');
});

test('la lista sigue al mapa: al alejarlo salen los locales de otras ciudades', async ({
  page,
}) => {
  await page.goto('/es');
  await expect(cards(page)).toHaveCount(6);
  const zoomOut = page.locator('.maplibregl-ctrl-zoom-out');
  await expect(async () => {
    await zoomOut.click();
    await expect(markers(page)).toHaveCount(8, { timeout: 1000 });
  }).toPass({ timeout: 25_000 });
  await expect(cards(page)).toHaveCount(8);
  await expect(page.getByText('8 locales en esta zona del mapa')).toBeVisible();
});

test('la búsqueda filtra la lista y el mapa a la vez', async ({ page }) => {
  await page.goto('/es');
  await expect(cards(page)).toHaveCount(6);
  await page.getByRole('searchbox').fill('masa madre');
  await expect(cards(page)).toHaveCount(1);
  await expect(markers(page)).toHaveCount(1);
  await page.getByRole('searchbox').fill('zzzz');
  await expect(
    page.getByRole('heading', {
      name: 'No hemos encontrado locales con esa búsqueda',
    }),
  ).toBeVisible();
});

test('una tarjeta lleva a la ficha y volver regresa a la pantalla partida', async ({
  page,
}) => {
  await page.goto('/es');
  await cards(page).first().getByRole('link').click();
  await expect(page).toHaveURL(/\/es\/place\/demo-/);
  await page
    .getByRole('link', { name: /Volver/ })
    .first()
    .click();
  await expect(cards(page)).toHaveCount(6);
  await expect(markers(page)).toHaveCount(6);
});

test('en 1280 px el listado cabe y no desborda la página', async ({ page }) => {
  await page.goto('/es');
  await expect(cards(page)).toHaveCount(6);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(0);
});
