import { expect, test } from './support/test';
import { fillPlace } from './support/propose';

test.use({ viewport: { width: 375, height: 800 } });

test('una propuesta se envía a la API con su idioma y sin fotos', async ({
  page,
  sent,
}) => {
  await page.goto('/en/propose');
  await page.getByLabel('Name of the place').fill('Local de prueba');
  await page.getByLabel('Country').selectOption('ES');
  await page.getByLabel('Address').fill('Calle Mayor 5');
  await page.getByLabel('City').fill('Madrid');
  await page.getByRole('button', { name: /Pizza/ }).click();
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Continue' }).click();
  }
  await page.getByRole('button', { name: /Send/ }).click();
  await expect(page.getByRole('heading', { name: /Thank/ })).toBeVisible();

  expect(sent).toHaveLength(1);
  expect(sent[0]).toMatchObject({
    path: '/proposals',
    body: {
      name: 'Local de prueba',
      street: 'Calle Mayor 5',
      city: 'Madrid',
      country: 'ES',
      foodTags: ['pizza'],
      locale: 'en',
    },
  });
  // Nada se guarda en el navegador: va todo a la API.
  expect(
    await page.evaluate(() =>
      window.localStorage.getItem('hearteats:demo-outbox'),
    ),
  ).toBeNull();
});

test('si hay demasiados envíos desde la conexión, lo dice sin alarmar', async ({
  page,
}) => {
  await page.route('http://localhost:3001/api/v1/proposals', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({
          status: 429,
          headers: { 'access-control-allow-origin': '*', 'retry-after': '60' },
          json: { error: { code: 'rate_limited', message: 'Demasiadas' } },
        })
      : route.fallback(),
  );
  await page.goto('/es/propose');
  await fillPlace(page, 'Local de prueba');
  await page.getByRole('button', { name: /Pizza/ }).click();
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Continuar' }).click();
  }
  await page.getByRole('button', { name: /Enviar/ }).click();
  await expect(page.locator('p[role=alert]')).toContainText(
    'vuelve a intentarlo',
  );
});
