import { expect, test } from '@playwright/test';

test('corregir un dato: se entra desde la ficha y recorre los 3 pasos', async ({
  page,
}) => {
  await page.goto('/es/place/demo-la-masa-madre');
  await page.getByRole('link', { name: 'Sugerir una corrección' }).click();
  await expect(
    page.getByRole('heading', { name: 'Sugerir una corrección' }),
  ).toBeVisible();
  await expect(page.getByText('[DEMO] La Masa Madre').first()).toBeVisible();

  // Sin elegir qué corregir no se avanza.
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('p[role=alert]')).toContainText('Elige qué hay');
  await page.getByLabel('El horario').check();
  await page.getByRole('button', { name: 'Continuar' }).click();

  // Hay que contar qué está mal, y el enlace, si se pone, tiene que ser válido.
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('p[role=alert]')).toContainText(
    'Cuéntanos qué hay',
  );
  await page.getByLabel('¿Qué ha cambiado').fill('Ahora cierra a las 18:00.');
  await page.getByLabel(/Un enlace que lo confirme/).fill('basura');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('p[role=alert]')).toContainText('https://');
  await page
    .getByLabel(/Un enlace que lo confirme/)
    .fill('https://ejemplo.org');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByText('El horario').first()).toBeVisible();
  await page.getByRole('button', { name: 'Enviar corrección' }).click();
  await expect(
    page.getByRole('heading', { name: '¡Gracias por avisarnos!' }),
  ).toBeFocused();
  await page.getByRole('link', { name: 'Volver a la ficha' }).click();
  await expect(
    page.getByRole('heading', { name: '[DEMO] La Masa Madre' }),
  ).toBeVisible();
});

test('corregir un dato: existe en inglés', async ({ page }) => {
  await page.goto('/en/correct/demo-la-masa-madre');
  await expect(
    page.getByRole('heading', { name: 'Suggest a correction' }),
  ).toBeVisible();
});

test('corregir un dato: desde el menú explica cómo llegar a la ficha', async ({
  page,
}) => {
  await page.goto('/es/correct');
  await expect(
    page.getByRole('heading', { name: '¿Qué local quieres corregir?' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Ver la lista de locales' }).click();
  await expect(page).toHaveURL(/\/es\/list$/);
});
