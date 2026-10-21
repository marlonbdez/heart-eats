import { expect, test } from './support/test';

test('una categoría marcada no cambia de tamaño ni lleva marca añadida', async ({
  page,
}) => {
  await page.goto('/es');
  const chip = page
    .getByRole('group', { name: 'Tipo de comida' })
    .getByRole('button', { name: 'Pizza' });
  await expect(chip).toBeVisible();
  const before = (await chip.boundingBox())!;
  const fontWeight = await chip.evaluate(
    (el) => getComputedStyle(el).fontWeight,
  );
  await chip.click();
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  const after = (await chip.boundingBox())!;
  expect(after.width).toBeCloseTo(before.width, 0);
  expect(after.height).toBeCloseTo(before.height, 0);
  // Sin negrita que la ensanche.
  expect(await chip.evaluate((el) => getComputedStyle(el).fontWeight)).toBe(
    fontWeight,
  );
});

test('la flecha del selector de lugar se ve a buen tamaño', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto('/es');
  const chevron = page.locator('svg:has(path[d="M6 9l6 6 6-6"])');
  await expect(chevron).toBeVisible();
  expect((await chevron.boundingBox())!.width).toBeGreaterThanOrEqual(16);
});

test('el logo queda cerca del menú, sin pisarlo', async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 700 });
    await page.goto('/es');
    const menu = (await page
      .getByRole('button', { name: 'Abrir menú' })
      .boundingBox())!;
    const logo = (await page
      .getByRole('link', { name: /HeartEats/ })
      .first()
      .boundingBox())!;
    expect(logo.x).toBeGreaterThanOrEqual(menu.x + menu.width - 8);
    expect(logo.x - (menu.x + menu.width)).toBeLessThanOrEqual(4);
  }
});

test('la frase de la lista lleva un corazón de la marca', async ({ page }) => {
  await page.goto('/es');
  const tagline = page
    .locator('#contenido')
    .getByText('Comer bien, con equipos que suman.');
  await expect(tagline).toBeVisible();
  await expect(tagline.locator('svg')).toBeVisible();
});

test('el menú lleva la frase con corazón y el © al pie', async ({ page }) => {
  await page.goto('/es');
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  const menu = page.getByRole('dialog');
  await expect(
    menu.getByText('Comer bien, con equipos que suman.'),
  ).toBeVisible();
  await expect(menu.getByText(/© 2026 HeartEats/)).toBeVisible();
  await page.goto('/en');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(
    page.getByRole('dialog').getByText(/© 2026 HeartEats/),
  ).toBeVisible();
});
