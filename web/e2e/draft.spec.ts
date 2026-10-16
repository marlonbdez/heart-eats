import { expect, test } from './support/test';

test.use({ viewport: { width: 375, height: 800 } });

const KEY = 'hearteats:draft-propose';

test('proponer un local: el borrador se recupera tras recargar, sin el correo', async ({
  page,
}) => {
  await page.goto('/es/propose');
  await page.getByLabel('Nombre del local').fill('Local a medias');
  await page.getByRole('button', { name: /Pizza/ }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel('Nombre del plato').fill('Lasaña');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page
    .getByLabel(/Un enlace que lo confirme/)
    .fill('https://ejemplo.org');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel(/Tu correo|Correo/).fill('yo@ejemplo.org');

  // Espera a que se guarde el paso 4 (el guardado llega 400 ms después de cada
  // cambio, y el nombre ya estaba guardado desde el paso 1).
  await expect
    .poll(() => page.evaluate((k) => window.localStorage.getItem(k), KEY))
    .toContain('"step":4');
  const stored = await page.evaluate(
    (k) => window.localStorage.getItem(k),
    KEY,
  );
  expect(stored).not.toContain('yo@ejemplo.org');

  // Recarga: vuelve al mismo paso, con lo escrito y el aviso.
  await page.reload();
  await expect(page.getByRole('status')).toContainText(
    'recuperado el borrador',
  );
  await expect(page.getByText(/Paso 4 de 4/)).toBeVisible();
  await page.getByRole('button', { name: 'Atrás' }).click();
  await page.getByRole('button', { name: 'Atrás' }).click();
  await page.getByRole('button', { name: 'Atrás' }).click();
  await expect(page.getByLabel('Nombre del local')).toHaveValue(
    'Local a medias',
  );

  // «Empezar de cero» lo borra del todo.
  await page.getByRole('button', { name: 'Empezar de cero' }).click();
  await expect(page.getByLabel('Nombre del local')).toHaveValue('');
  expect(
    await page.evaluate((k) => window.localStorage.getItem(k), KEY),
  ).toBeNull();
  await page.reload();
  await expect(page.getByText('recuperado el borrador')).toHaveCount(0);
});

test('proponer un local: al enviar, el borrador desaparece', async ({
  page,
}) => {
  await page.goto('/es/propose');
  await page.getByLabel('Nombre del local').fill('Se enviará');
  await expect
    .poll(() => page.evaluate((k) => window.localStorage.getItem(k), KEY))
    .toContain('Se enviará');
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Continuar' }).click();
  }
  await page.getByRole('button', { name: /Enviar propuesta/ }).click();
  await expect(page.getByRole('heading', { name: /Gracias/ })).toBeVisible();
  await expect
    .poll(() => page.evaluate((k) => window.localStorage.getItem(k), KEY))
    .toBeNull();
});

test('un borrador roto o caducado no estropea el formulario', async ({
  page,
}) => {
  await page.goto('/es/propose');
  await page.evaluate(
    (k) => window.localStorage.setItem(k, '{no es json'),
    KEY,
  );
  await page.reload();
  await expect(page.getByLabel('Nombre del local')).toHaveValue('');
  await page.evaluate(
    (k) =>
      window.localStorage.setItem(
        k,
        JSON.stringify({
          data: { form: { name: 'Viejo' }, step: 1 },
          savedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
        }),
      ),
    KEY,
  );
  await page.reload();
  await expect(page.getByLabel('Nombre del local')).toHaveValue('');
});
