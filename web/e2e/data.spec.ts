import { API, expect, test } from './support/test';

// La web no lleva datos fijos: todo viene de la API. Estas pruebas cubren qué
// ve la persona cuando la API no devuelve locales o falla.

test('sin locales publicados lo dice con calma y deja proponer el primero', async ({
  page,
}) => {
  await page.route(`${API}/restaurants?**`, (route) =>
    route.fulfill({
      headers: { 'access-control-allow-origin': '*' },
      json: { items: [] },
    }),
  );
  await page.goto('/es');
  await expect(
    page.getByRole('heading', { name: 'Todavía no hay locales publicados' }),
  ).toBeVisible();
  await expect(
    page.locator('#contenido').getByRole('link', { name: 'Proponer un local' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Quitar filtros' }),
  ).toHaveCount(0);
});

test('si la API falla avisa y deja reintentar', async ({ page }) => {
  let failing = true;
  await page.route(`${API}/restaurants?**`, async (route) => {
    if (failing) return route.fulfill({ status: 503, body: '' });
    return route.fallback();
  });
  await page.goto('/es/list');
  await expect(page.locator('#contenido').getByRole('alert')).toContainText(
    'No hemos podido cargar los datos',
  );
  failing = false;
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(
    page.getByRole('list', { name: 'Lista de locales' }),
  ).toBeVisible();
});

test('la ficha de un local se abre por su dirección, aunque no se generara al compilar', async ({
  page,
}) => {
  await page.goto('/es/place/demo-la-masa-madre');
  await expect(
    page.getByRole('heading', { level: 1, name: /La Masa Madre/ }),
  ).toBeVisible();
  await expect(page).toHaveTitle(/La Masa Madre/);
});

test('una ficha que no existe avisa y lleva al mapa', async ({ page }) => {
  await page.goto('/en/place/no-existe');
  await expect(
    page.getByRole('heading', { name: 'We could not find this place' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Back to the map' }).click();
  await expect(page).toHaveURL(/\/en$/);
});

test('corregir y contar el equipo funcionan con la dirección del local', async ({
  page,
}) => {
  await page.goto('/es/correct/demo-la-masa-madre');
  await expect(page.getByText(/La Masa Madre/).first()).toBeVisible();
  await page.goto('/es/business/demo-la-masa-madre');
  await expect(page.getByRole('combobox').first()).toHaveValue(
    'demo-la-masa-madre',
  );
  await page.goto('/es/business/no-existe');
  await expect(
    page.getByRole('heading', { name: 'No encontramos este local' }),
  ).toBeVisible();
});
