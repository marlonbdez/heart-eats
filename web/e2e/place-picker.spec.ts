import { choosePlace, expect, test, type Page } from './support/test';

test.use({ viewport: { width: 320, height: 700 } });

const LABEL = '¿En qué local aparece?';

// «Pedir una retirada», paso 2: ahí está el buscador de local.
async function toPlaceStep(page: Page, locale = 'es') {
  await page.goto(`/${locale}/removal`);
  await page.getByLabel(/Una historia|A story/).check();
  await page.getByRole('button', { name: /Continuar|Continue/ }).click();
}

test('buscar un local: pide dos letras, avisa si no hay y Intro no avanza', async ({
  page,
}) => {
  await toPlaceStep(page);
  const search = page.getByLabel(LABEL, { exact: true });
  await expect(search).toHaveAttribute('type', 'search');
  await expect(
    page.getByText('Escribe al menos dos letras del nombre del local.'),
  ).toBeVisible();

  await search.fill('zzz');
  await expect(
    page.getByText('No hemos encontrado ningún local con ese nombre'),
  ).toBeVisible();

  // Con una sola letra no se busca ni se enseña el aviso anterior.
  await search.fill('m');
  await expect(
    page.getByText('No hemos encontrado ningún local con ese nombre'),
  ).toBeHidden();

  // Intro busca al momento y no pasa al paso siguiente.
  await search.fill('Café');
  await search.press('Enter');
  await expect(page.getByText('Paso 2 de 3')).toBeVisible();
  await expect(page.getByText('2 locales encontrados')).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Café Paso a Paso/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Cafè del Mar/ }),
  ).toBeVisible();
});

test('elegir un local, cambiarlo y volver al mismo buscador', async ({
  page,
}) => {
  await toPlaceStep(page);
  await choosePlace(page, LABEL, 'masa madre', 'La Masa Madre');

  // Elegido: se ve cuál es, con su dirección, y el foco va a «Cambiar».
  const chosen = page.getByRole('group', { name: LABEL });
  await expect(chosen).toContainText('[DEMO] La Masa Madre');
  await expect(chosen).toContainText('Calle de Ejemplo 12 · Madrid');
  await expect(
    page.getByRole('button', { name: 'Cambiar de local' }),
  ).toBeFocused();

  // Cambiar devuelve al buscador, con lo escrito y el foco puesto.
  await page.getByRole('button', { name: 'Cambiar de local' }).click();
  const search = page.getByLabel(LABEL, { exact: true });
  await expect(search).toBeFocused();
  await expect(search).toHaveValue('masa madre');
});

test('sin elegir local no se avanza, y se puede buscar en otro país', async ({
  page,
  sent,
}) => {
  await toPlaceStep(page);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('p[role=alert]')).toContainText('Elige el local');
  await expect(page.getByLabel(LABEL, { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );

  // El país va primero y con su nombre en el idioma de la web.
  await page.getByLabel('País').selectOption('JP');
  await choosePlace(page, LABEL, 'さくら', 'さくら食堂');
  await expect(page.getByRole('group', { name: LABEL })).toContainText(
    '例通り 5 · 東京',
  );

  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel('Tu correo').fill('persona@ejemplo.org');
  await page.getByRole('button', { name: 'Enviar petición' }).click();
  await expect(
    page.getByRole('heading', { name: 'Petición recibida' }),
  ).toBeFocused();
  expect(sent).toMatchObject([
    {
      path: '/removals',
      body: { restaurantSlug: 'demo-sakura-shokudo', what: 'story' },
    },
  ]);

  // Sin desbordes horizontales a 320 px.
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('el buscador de local existe en inglés', async ({ page }) => {
  await toPlaceStep(page, 'en');
  await page.getByLabel('Country').selectOption('ES');
  await choosePlace(
    page,
    'Which place does it appear on?',
    'burger',
    'Burger del Barrio',
  );
  await expect(
    page.getByRole('group', { name: 'Which place does it appear on?' }),
  ).toContainText('[DEMO] Burger del Barrio');
});

test('si la búsqueda falla, avisa y deja reintentar', async ({ page }) => {
  await toPlaceStep(page);
  let fail = true;
  await page.route(/\/restaurants\?.*q=/, (route) =>
    fail
      ? route.fulfill({
          status: 500,
          headers: { 'access-control-allow-origin': '*' },
          json: { error: { code: 'internal', message: 'Error' } },
        })
      : route.fallback(),
  );
  await page.getByLabel(LABEL, { exact: true }).fill('masa');
  await expect(
    page.getByText('No hemos podido buscar ahora mismo.'),
  ).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: 'Intentarlo de nuevo' }).click();
  await expect(
    page.getByRole('button', { name: /La Masa Madre/ }),
  ).toBeVisible();
});
