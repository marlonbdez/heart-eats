import { choosePlace, expect, test } from './support/test';

test.use({ viewport: { width: 360, height: 800 } });

test('pedir una retirada: 3 pasos, valida y se envía a la API', async ({
  page,
  sent,
}) => {
  await page.goto('/es/removal');
  await expect(
    page.getByRole('heading', { name: 'Pedir una retirada' }),
  ).toBeVisible();

  // Paso 1: hay que elegir qué retirar.
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('p[role=alert]')).toContainText('Elige qué');
  await page.getByLabel(/Una historia/).check();
  await page.getByRole('button', { name: 'Continuar' }).click();

  // Paso 2: hay que elegir el local.
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('p[role=alert]')).toContainText('Elige el local');
  await choosePlace(
    page,
    '¿En qué local aparece?',
    'masa madre',
    'La Masa Madre',
  );
  await page.getByRole('button', { name: 'Continuar' }).click();

  // Paso 3: sin correo válido no se envía (es lo que confirma la identidad).
  await page.getByRole('button', { name: 'Enviar petición' }).click();
  await expect(page.locator('p[role=alert]')).toContainText('correo válido');
  await page.getByLabel('Tu correo').fill('persona@ejemplo.org');
  await page.getByRole('button', { name: 'Enviar petición' }).click();
  await expect(
    page.getByRole('heading', { name: 'Petición recibida' }),
  ).toBeFocused();

  // Sin desbordes horizontales en el móvil.
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  // Se envía a la API con el idioma y el correo (necesario para confirmar quién pide).
  expect(sent).toEqual([
    {
      path: '/removals',
      body: {
        restaurantSlug: 'demo-la-masa-madre',
        what: 'story',
        contactEmail: 'persona@ejemplo.org',
        locale: 'es',
      },
    },
  ]);
});

test('la retirada se encuentra desde el menú, contacto y privacidad, y existe en inglés', async ({
  page,
}) => {
  await page.goto('/es/contact');
  await page
    .locator('#contenido')
    .getByRole('link', { name: 'Pedir una retirada' })
    .click();
  await expect(page).toHaveURL(/\/es\/removal$/);

  await page.goto('/es/privacy');
  await expect(
    page
      .locator('#contenido')
      .getByRole('link', { name: 'Pedir una retirada' }),
  ).toBeVisible();

  await page.goto('/es');
  await page.getByRole('button', { name: /menú/i }).first().click();
  await page.getByRole('link', { name: 'Pedir una retirada' }).click();
  await expect(page).toHaveURL(/\/es\/removal$/);

  await page.goto('/en/removal');
  await expect(
    page.getByRole('heading', { name: 'Ask for something to be removed' }),
  ).toBeVisible();
});
