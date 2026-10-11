import { expect, test } from '@playwright/test';

test('privacidad y contacto en el móvil: se leen sin desplazarse de lado', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  for (const [path, title] of [
    ['/es/privacy', 'Privacidad y datos'],
    ['/es/contact', 'Contacto'],
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole('heading', { level: 1, name: title }),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
  }
});

test('contacto lleva a proponer un local', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/es/contact');
  await page
    .locator('#contenido')
    .getByRole('link', { name: 'Proponer un local' })
    .click();
  await expect(page).toHaveURL(/\/es\/propose$/);
});

test('en inglés', async ({ page }) => {
  await page.goto('/en/privacy');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Privacy and data' }),
  ).toBeVisible();
  await page.goto('/en/contact');
  await expect(
    page.getByRole('link', { name: 'Report a bug on GitHub' }),
  ).toHaveAttribute('href', 'https://github.com/marlonbdez/heart-eats/issues');
});

test('el correo de contacto aparece en Contacto y en Privacidad, en ES y EN', async ({
  page,
}) => {
  for (const path of [
    '/es/contact',
    '/es/privacy',
    '/en/contact',
    '/en/privacy',
  ]) {
    await page.goto(path);
    await expect(
      page
        .locator('#contenido')
        .locator('a[href="mailto:contact@hearteats.org"]'),
    ).toBeVisible();
  }
  // Ya no se promete una dirección «en preparación».
  await page.goto('/es/contact');
  await expect(page.getByText('Todavía la estamos preparando')).toHaveCount(0);
});
