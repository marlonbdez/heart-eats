import { expect, test } from './support/test';

const list = (page: import('@playwright/test').Page) =>
  page.getByRole('list', { name: 'Lista de locales' });
const card = (page: import('@playwright/test').Page, name: string) =>
  list(page).getByRole('listitem').filter({ hasText: name });

test('la tarjeta de la lista pone la foto arriba y el nombre debajo', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/es/list');
  const item = card(page, '[DEMO] La Masa Madre');
  const photo = (await item.locator('img').boundingBox())!;
  const name = (await item.getByRole('heading').boundingBox())!;
  const box = (await item.boundingBox())!;
  // La foto ocupa todo el ancho de la tarjeta y está sobre el nombre.
  expect(Math.abs(photo.width - (box.width - 2))).toBeLessThan(2);
  expect(photo.y + photo.height).toBeLessThanOrEqual(name.y);
  expect(photo.height).toBeGreaterThan(200);
  // Lleva el plato estrella, el barrio y el sello.
  await expect(item).toContainText('Plato estrella');
  await expect(item).toContainText('Margarita de la casa');
  await expect(item).toContainText('Lavapiés');
  await expect(item).toContainText('Equipo inclusivo');
});

test('tocar cualquier parte de la tarjeta abre la ficha', async ({ page }) => {
  await page.goto('/es/list');
  // Un toque sobre la foto (no sobre el texto del nombre).
  await card(page, '[DEMO] La Masa Madre').click({
    position: { x: 20, y: 20 },
  });
  await expect(page).toHaveURL(/\/es\/place\/demo-la-masa-madre/);
  await page.goBack();
  // El enlace es el nombre del local, con teclado también.
  const link = card(page, '[DEMO] La Masa Madre').getByRole('link', {
    name: '[DEMO] La Masa Madre',
  });
  await link.focus();
  await expect(link).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/es\/place\/demo-la-masa-madre/);
});

test('un local sin foto muestra un hueco tranquilo en su lugar', async ({
  page,
}) => {
  await page.goto('/es/list');
  const item = card(page, '[DEMO] Verde que te quiero');
  await expect(item.getByRole('img', { name: 'Sin foto' })).toBeVisible();
});

test('en pantalla ancha las tarjetas se reparten en columnas', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/es/list');
  const items = list(page).getByRole('listitem');
  const a = (await items.nth(0).boundingBox())!;
  const b = (await items.nth(1).boundingBox())!;
  const c = (await items.nth(2).boundingBox())!;
  expect(b.y).toBeCloseTo(a.y, 0);
  expect(c.y).toBeCloseTo(a.y, 0);
  expect(b.x).toBeGreaterThan(a.x + a.width - 1);
});

for (const width of [320, 390]) {
  test(`lista ${width}px: las tarjetas caben, también con letra ancha`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 700 });
    await page.goto('/es/list');
    await expect(list(page).getByRole('listitem').first()).toBeVisible();
    await page.addStyleTag({
      content: '* { font-family: Verdana !important; }',
    });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(0);
    const box = (await list(page).getByRole('listitem').first().boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
  });
}
