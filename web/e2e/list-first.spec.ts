import { expect, test } from './support/test';

// En el móvil lo primero que se ve es la lista; el mapa está en /map, a un
// botón de distancia.
const cards = (page: import('@playwright/test').Page) =>
  page.getByRole('list', { name: 'Lista de locales' }).getByRole('listitem');

test('al entrar se ve la lista con su frase, y el mapa no se carga', async ({
  page,
}) => {
  await page.goto('/es');
  await expect(
    page
      .locator('#contenido')
      .getByText('Comer bien, con equipos que suman.', { exact: true }),
  ).toBeVisible();
  await expect(cards(page)).toHaveCount(6);
  await expect(page.locator('[data-marker]')).toHaveCount(0);
  await expect(
    page.getByRole('region', { name: 'Mapa de locales' }),
  ).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Mapa' })).toBeVisible();
});

test('la frase también está en inglés', async ({ page }) => {
  await page.goto('/en');
  await expect(
    page
      .locator('#contenido')
      .getByText('Great food, with teams that make a difference.', {
        exact: true,
      }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Map' })).toBeVisible();
});

test('«Mapa» lleva al mapa con la búsqueda y «Lista» vuelve', async ({
  page,
}) => {
  await page.goto('/es?food=pizza');
  await expect(cards(page)).toHaveCount(1);
  await page.getByRole('link', { name: 'Mapa' }).click();
  await expect(page).toHaveURL(/\/es\/map\?food=pizza$/);
  await expect(page.locator('[data-marker]')).toHaveCount(1);
  // En el mapa, el conmutador de arriba vuelve a la lista.
  await page
    .getByRole('navigation', { name: 'Vista' })
    .getByRole('link', { name: 'Lista' })
    .click();
  await expect(page).toHaveURL(/\/es\?food=pizza$/);
  await expect(cards(page)).toHaveCount(1);
});

test('/list sigue existiendo y enseña lo mismo que la portada', async ({
  page,
}) => {
  await page.goto('/es/list');
  await expect(cards(page)).toHaveCount(6);
  await expect(page.getByRole('link', { name: 'Mapa' })).toBeVisible();
});

test('de una ficha se vuelve a donde se estaba: lista o mapa', async ({
  page,
}) => {
  await page.goto('/es/map');
  await page.locator('[data-marker]').first().click();
  await page.getByRole('complementary').getByRole('link').last().click();
  await expect(page).toHaveURL(/\/es\/place\/demo-.*from=map/);
  await page
    .getByRole('link', { name: /Volver/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/es\/map$/);

  await page.goto('/es');
  await cards(page).first().getByRole('link').click();
  await expect(page).not.toHaveURL(/from=/);
  await page
    .getByRole('link', { name: /Volver/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/es$/);
});

test('el menú tiene Lista y Mapa', async ({ page }) => {
  await page.goto('/es');
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  const menu = page.getByRole('dialog');
  await expect(
    menu.getByRole('link', { name: 'Lista de locales' }),
  ).toHaveAttribute('href', '/es');
  await expect(menu.getByRole('link', { name: 'Mapa' })).toHaveAttribute(
    'href',
    '/es/map',
  );
});

test('en desktop, la portada y el mapa enseñan lista y mapa a la vez', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/es');
  await expect(cards(page)).toHaveCount(6);
  await expect(page.locator('[data-marker]')).toHaveCount(6);
  // Con todo a la vista no hace falta el botón.
  await expect(
    page.getByRole('link', { name: 'Mapa', exact: true }),
  ).toHaveCount(0);
});
