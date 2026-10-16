import { expect, test } from './support/test';

test.use({ viewport: { width: 360, height: 800 } });

test('responder a «Info pedida»: se lee la nota y se envía la respuesta', async ({
  page,
  sent,
}) => {
  await page.goto('/es/reply#token=good');
  await expect(
    page.getByRole('heading', { name: 'Responder a Moderación' }),
  ).toBeVisible();
  await expect(page.getByText('[DEMO] Café Nuevo')).toBeVisible();
  await expect(page.getByText('tiene rampa en la entrada')).toBeVisible();
  await expect(
    page.getByText(/hasta el 20 de noviembre de 2026/),
  ).toBeVisible();

  // Vacía no se envía.
  await page.getByRole('button', { name: 'Enviar respuesta' }).click();
  await expect(page.locator('p[role=alert]')).toContainText(
    'Escribe tu respuesta',
  );
  expect(sent).toEqual([]);

  await page.getByLabel('Tu respuesta').fill('Sí, hay una rampa de 90 cm.');
  await page.getByRole('button', { name: 'Enviar respuesta' }).click();
  await expect(
    page.getByRole('heading', { name: '¡Gracias por responder!' }),
  ).toBeFocused();
  expect(sent).toEqual([
    { path: '/replies/good', body: { message: 'Sí, hay una rampa de 90 cm.' } },
  ]);

  // Sin desbordes horizontales en el móvil.
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('responder: un enlace caducado o ya usado lo explica con calma', async ({
  page,
}) => {
  await page.goto('/es/reply#token=used');
  await expect(
    page.getByRole('heading', { name: 'Este enlace ya no es válido' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Ir a contacto' }).click();
  await expect(page).toHaveURL(/\/es\/contact$/);
});

test('responder: sin token en la dirección también se explica', async ({
  page,
}) => {
  await page.goto('/es/reply');
  await expect(
    page.getByRole('heading', { name: 'Este enlace ya no es válido' }),
  ).toBeVisible();
});

test('responder: si el enlace se gasta mientras se escribe, se avisa', async ({
  page,
}) => {
  await page.goto('/es/reply#token=good');
  await page.route('**/api/v1/replies/good', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({
          status: 404,
          headers: { 'access-control-allow-origin': '*' },
          json: { error: { code: 'not_found', message: 'Ya no vale' } },
        })
      : route.fallback(),
  );
  await page.getByLabel('Tu respuesta').fill('Gracias');
  await page.getByRole('button', { name: 'Enviar respuesta' }).click();
  await expect(
    page.getByRole('heading', { name: 'Este enlace ya no es válido' }),
  ).toBeVisible();
});

test('responder: con demasiadas respuestas avisa sin culpar', async ({
  page,
}) => {
  await page.goto('/es/reply#token=busy');
  await page.getByLabel('Tu respuesta').fill('Hola');
  await page.getByRole('button', { name: 'Enviar respuesta' }).click();
  await expect(page.locator('p[role=alert]')).toContainText(
    'vuelve a intentarlo dentro de un rato',
  );
});

test('responder: existe en inglés', async ({ page }) => {
  await page.goto('/en/reply#token=good');
  await expect(
    page.getByRole('heading', { name: 'Reply to Moderation' }),
  ).toBeVisible();
  await expect(page.getByLabel('Your reply')).toBeVisible();
});
