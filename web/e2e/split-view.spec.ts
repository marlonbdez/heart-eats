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
  await page.goto('/es/map');
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

test('al tocar un pin, el pin y su tarjeta se animan juntos (y no con menos movimiento)', async ({
  page,
}) => {
  const animation = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((el) => getComputedStyle(el).animationName);

  await page.goto('/es');
  await expect(cards(page)).toHaveCount(6);
  const slug = await cards(page).first().getAttribute('data-slug');
  const pin = `[data-marker="${slug}"] svg`;
  const card = `[data-slug="${slug}"]`;
  expect(await animation(pin)).toBe('none');

  await page.locator(`[data-marker="${slug}"]`).click();
  await expect(cards(page).first()).toHaveAttribute('data-selected', 'true');
  expect(await animation(pin)).toMatch(/pop/);
  expect(await animation(card)).toMatch(/beat/);

  // Con «reducir movimiento» solo queda el estado fijo.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await animation(pin)).toBe('none');
  expect(await animation(card)).toBe('none');
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

const pin = (page: Page, slug: string | null) =>
  page.locator(`[data-marker="${slug}"]`);

test('al pasar el ratón por una tarjeta se resalta su pin, y al salir se quita', async ({
  page,
}) => {
  await page.goto('/es');
  await expect(cards(page)).toHaveCount(6);
  const card = cards(page).nth(1);
  const slug = await card.getAttribute('data-slug');
  await expect(pin(page, slug)).not.toHaveAttribute('data-highlight', 'true');

  await card.hover();
  await expect(pin(page, slug)).toHaveAttribute('data-highlight', 'true');
  await expect(page.locator('[data-highlight="true"]')).toHaveCount(1);

  await page.getByRole('searchbox').hover();
  await expect(pin(page, slug)).not.toHaveAttribute('data-highlight', 'true');
});

test('al pasar el ratón por un pin se resalta su tarjeta', async ({ page }) => {
  await page.goto('/es');
  await expect(cards(page)).toHaveCount(6);
  const slug = await cards(page).nth(2).getAttribute('data-slug');
  await pin(page, slug).hover();
  await expect(cards(page).nth(2)).toHaveAttribute('data-hover', 'true');
  await expect(page.locator('[data-hover="true"]')).toHaveCount(1);

  await page.getByRole('searchbox').hover();
  await expect(cards(page).nth(2)).toHaveAttribute('data-hover', 'false');
});

test('con el teclado, el foco en una tarjeta o en un pin también resalta al otro', async ({
  page,
}) => {
  await page.goto('/es');
  await expect(cards(page)).toHaveCount(6);
  const card = cards(page).nth(3);
  const slug = await card.getAttribute('data-slug');

  await card.getByRole('link').focus();
  await expect(pin(page, slug)).toHaveAttribute('data-highlight', 'true');
  await card.getByRole('link').blur();
  await expect(pin(page, slug)).not.toHaveAttribute('data-highlight', 'true');

  await pin(page, slug).focus();
  await expect(card).toHaveAttribute('data-hover', 'true');
  await pin(page, slug).blur();
  await expect(card).toHaveAttribute('data-hover', 'false');
});

test('por debajo de 900 px no hay resalte', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 800 });
  await page.goto('/es/list');
  await expect(cards(page).first()).toBeVisible();
  await cards(page).first().hover();
  await expect(page.locator('[data-hover="true"]')).toHaveCount(0);
});

for (const width of [900, 1280, 1920]) {
  test(`${width}px: la lista y el mapa se reparten la pantalla al 50 %`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/es');
    await expect(cards(page)).toHaveCount(6);
    const mapBox = (await page
      .getByRole('region', { name: 'Mapa de locales' })
      .boundingBox())!;
    const pane = (await page.locator('[class*="listPane"]').boundingBox())!;
    expect(Math.abs(pane.width - width / 2)).toBeLessThanOrEqual(1);
    expect(Math.abs(mapBox.width - width / 2)).toBeLessThanOrEqual(2);
  });
}

test('la barra de desplazamiento de la lista es fina y discreta', async ({
  page,
}) => {
  await page.goto('/es');
  await expect(cards(page)).toHaveCount(6);
  const style = await page.locator('[class*="listScroll"]').evaluate((el) => {
    const s = getComputedStyle(el);
    return { width: s.scrollbarWidth, color: s.scrollbarColor };
  });
  expect(style.width).toBe('thin');
  // Fondo transparente: el carril no pesa.
  expect(style.color).toMatch(/transparent|rgba\(0, 0, 0, 0\)/);
});
