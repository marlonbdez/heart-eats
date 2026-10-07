import { expect, test } from '@playwright/test';

test('proponer un local: valida el nombre y recorre los 4 pasos', async ({
  page,
}) => {
  await page.goto('/es/proponer');

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
  await expect(page.locator('p[role=alert]')).toContainText('enlace válido');
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
  await page.goto('/en/proponer');
  await expect(
    page.getByRole('heading', { name: 'Suggest a place' }),
  ).toBeVisible();
});
