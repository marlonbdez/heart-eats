import { expect, test } from '@playwright/test';

test('proponer un local: valida el nombre y recorre los 4 pasos', async ({
  page,
}) => {
  await page.goto('/es/propose');

  // Sin nombre no se avanza.
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('p[role=alert]')).toContainText('nombre del local');

  await page.getByLabel('Nombre del local').fill('Local de prueba');
  await page.getByRole('button', { name: /Pizza/ }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByText('Plato 1')).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();

  await page.getByLabel(/Un enlace que lo confirme/).fill('basura');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('p[role=alert]')).toContainText('https://');
  await page
    .getByLabel(/Un enlace que lo confirme/)
    .fill('https://ejemplo.org');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByText('Local de prueba')).toBeVisible();
  await page.getByRole('button', { name: 'Enviar propuesta' }).click();
  await expect(
    page.getByRole('heading', { name: '¡Gracias por proponerlo!' }),
  ).toBeFocused();
});

test('proponer un local: existe en inglés', async ({ page }) => {
  await page.goto('/en/propose');
  await expect(
    page.getByRole('heading', { name: 'Suggest a place' }),
  ).toBeVisible();
});

// PNG de 1×1 píxel, para probar la subida sin depender de ningún archivo.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

test('proponer un local: foto opcional, con permiso, hasta moderación', async ({
  page,
}) => {
  await page.goto('/es/propose');
  await page.getByLabel('Nombre del local').fill('Local con foto');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await page.getByLabel('Nombre del plato').fill('Tarta de la casa');
  const file = page.locator('input[type=file]');

  // Un archivo que no es imagen se rechaza con un aviso.
  await file.setInputFiles({
    name: 'nota.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('hola'),
  });
  await expect(page.locator('p[role=alert]')).toContainText('JPG, PNG o WebP');

  // Una imagen se reduce y se ve la vista previa, con su nombre accesible.
  await file.setInputFiles({
    name: 'plato.png',
    mimeType: 'image/png',
    buffer: PIXEL,
  });
  await expect(
    page.getByRole('img', { name: 'Foto del plato 1' }),
  ).toBeVisible();

  // Sin el permiso no se continúa.
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('p[role=alert]')).toContainText('Marca la casilla');
  await page.getByLabel(/Estas fotos son mías/).check();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByText('1 foto')).toBeVisible();
  await page.getByRole('button', { name: 'Enviar propuesta' }).click();
  await expect(
    page.getByRole('heading', { name: '¡Gracias por proponerlo!' }),
  ).toBeFocused();

  // En el buzón no queda la imagen, y Moderación pide comprobar el permiso.
  const stored = await page.evaluate(() =>
    window.localStorage.getItem('hearteats:demo-outbox'),
  );
  expect(stored).not.toContain('data:image');
  await page.goto('/es/moderation');
  await page
    .getByRole('button', { name: /Nuevo local.*Local con foto/s })
    .click();
  await expect(
    page.getByText(/1 \(este prototipo no las muestra\)/),
  ).toBeVisible();
  await expect(page.getByLabel(/Las fotos son del plato/)).toBeVisible();
});

test('proponer un local: se puede quitar la foto y seguir sin ella', async ({
  page,
}) => {
  await page.goto('/es/propose');
  await page.getByLabel('Nombre del local').fill('Otro local');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'plato.png',
    mimeType: 'image/png',
    buffer: PIXEL,
  });
  await page.getByRole('button', { name: 'Quitar foto' }).click();
  await expect(page.locator('input[type=file]')).toBeVisible();
  // Sin fotos, ya no se pide el permiso.
  await expect(page.getByLabel(/Estas fotos son mías/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByLabel(/Un enlace que lo confirme/)).toBeVisible();
});
