import { expect, test } from './support/test';

test.use({ viewport: { width: 375, height: 800 } });

test('lo que cuenta un negocio (F3) llega a moderación, sin su correo entero', async ({
  page,
}) => {
  await page.goto('/es/business');
  await page
    .getByLabel('¿De qué local se trata?')
    .selectOption('demo-la-masa-madre');
  await page.getByRole('button', { name: 'Empezar' }).click();
  await page.getByLabel(/Solo cifras/).check();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel('Personas en el equipo').fill('8');
  await page.getByLabel('De ellas, con discapacidad').fill('3');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel('Correo de contacto').fill('negocio@ejemplo.org');
  await page.getByLabel(/Soy responsable del negocio/).check();
  await page.getByRole('button', { name: 'Enviar a revisión' }).click();
  await expect(page.getByRole('heading', { name: '¡Gracias!' })).toBeFocused();

  // En el almacenamiento no queda el correo entero.
  const stored = await page.evaluate(() =>
    window.localStorage.getItem('hearteats:demo-outbox'),
  );
  expect(stored).not.toContain('negocio@ejemplo.org');

  await page.goto('/es/moderation');
  await expect(page.getByText('Tienes 1 envío de prueba')).toBeVisible();
  const item = page.getByRole('button', { name: /Equipo.*La Masa Madre/s });
  await expect(item).toBeVisible();
  await item.click();

  await expect(page.getByText('3 de 8 con discapacidad')).toBeVisible();
  await expect(page.getByText('n***@ejemplo.org')).toBeVisible();

  // Sin comprobaciones no se publica; con ellas, sí.
  await page
    .getByRole('button', { name: 'Aprobar y publicar el equipo' })
    .click();
  await expect(page.locator('p[role=alert]')).toContainText('Faltan');
  await page.getByLabel(/He confirmado con el negocio/).check();
  await page.getByLabel(/Las cifras son coherentes/).check();
  await page
    .getByRole('button', { name: 'Aprobar y publicar el equipo' })
    .click();
  await expect(page.getByRole('status')).toContainText('Equipo publicado');

  // Y se pueden borrar los envíos de prueba.
  await page.getByRole('button', { name: 'Volver a la lista' }).click();
  await page
    .getByRole('button', { name: 'Borrar mis envíos de prueba' })
    .click();
  await expect(page.getByText('Tienes 1 envío de prueba')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Tienes 1 envío de prueba')).toHaveCount(0);
});

test('una propuesta se envía a la API con su idioma y sin fotos', async ({
  page,
  sent,
}) => {
  await page.goto('/en/propose');
  await page.getByLabel('Name of the place').fill('Local de prueba');
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
      city: 'Madrid',
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
  await page.getByLabel('Nombre del local').fill('Local de prueba');
  await page.getByRole('button', { name: /Pizza/ }).click();
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Continuar' }).click();
  }
  await page.getByRole('button', { name: /Enviar/ }).click();
  await expect(page.locator('p[role=alert]')).toContainText(
    'vuelve a intentarlo',
  );
});
