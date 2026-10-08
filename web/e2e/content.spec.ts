import { expect, test } from '@playwright/test';

test('las páginas de contenido existen en español y en inglés', async ({
  page,
}) => {
  await page.goto('/es/about');
  await expect(
    page.getByRole('heading', { name: 'Qué es HeartEats', level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Por qué existe' }),
  ).toBeVisible();

  await page.goto('/es/verification');
  await expect(
    page.getByRole('heading', { name: 'Cómo verificamos', level: 1 }),
  ).toBeVisible();
  // Los pasos de una propuesta van en una lista numerada.
  await expect(page.locator('main ol li')).toHaveCount(5);

  await page.goto('/en/about');
  await expect(
    page.getByRole('heading', { name: 'What is HeartEats', level: 1 }),
  ).toBeVisible();

  await page.goto('/en/verification');
  await expect(
    page.getByRole('heading', { name: 'How we verify', level: 1 }),
  ).toBeVisible();
});
