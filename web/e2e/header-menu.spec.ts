import { expect, test } from './support/test';

test('el idioma de la cabecera es solo un icono, con nombre accesible', async ({
  page,
}) => {
  await page.goto('/es');
  const button = page.getByRole('button', { name: 'ES · Idioma' });
  await expect(button).toBeVisible();
  // Solo el icono: ni código ni flecha a la vista.
  await expect(button).toHaveText('');
  await expect(button.locator('svg')).toHaveCount(1);
  const box = (await button.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  // Sigue desplegando la lista de idiomas.
  await button.click();
  await expect(page.getByRole('button', { name: 'English' })).toBeVisible();
});

test('el menú lateral lleva el idioma y el tema con icono y texto', async ({
  page,
}) => {
  await page.goto('/es');
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  const menu = page.getByRole('dialog');

  const language = menu.getByRole('group', { name: 'Idioma' });
  await expect(language.getByRole('radio', { name: 'Español' })).toBeChecked();
  await expect(
    language.getByRole('radio', { name: 'English' }),
  ).not.toBeChecked();

  const theme = menu.getByRole('group', { name: 'Tema' });
  for (const name of ['Sistema', 'Claro', 'Oscuro']) {
    await expect(theme.getByRole('radio', { name })).toBeAttached();
    // Cada opción lleva su icono, y ninguna ocupa más que un botón táctil.
    const label = theme.locator('label', { hasText: name });
    await expect(label.locator('svg')).toBeVisible();
    expect((await label.boundingBox())!.height).toBeLessThanOrEqual(52);
  }
});

test('elegir idioma en el menú lo cambia, lo recuerda y conserva la búsqueda', async ({
  page,
}) => {
  await page.goto('/es?q=lavapies');
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await page
    .getByRole('dialog')
    .getByRole('group', { name: 'Idioma' })
    .getByText('English')
    .click();
  await expect(page).toHaveURL(/\/en\?q=lavapies$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('searchbox')).toHaveValue('lavapies');
  expect(
    await page.evaluate(() => localStorage.getItem('hearteats:language')),
  ).toBe('en');
  // El menú se cierra al cambiar y ahora marca English.
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(
    page
      .getByRole('dialog')
      .getByRole('group', { name: 'Language' })
      .getByRole('radio', { name: 'English' }),
  ).toBeChecked();
});

for (const width of [320, 390]) {
  test(`móvil ${width}px: la cabecera cabe con el icono y el menú no desborda (letra ancha)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 700 });
    await page.goto('/es');
    await page.addStyleTag({
      content: '* { font-family: Verdana !important; }',
    });
    const language = (await page
      .getByRole('button', { name: 'ES · Idioma' })
      .boundingBox())!;
    expect(language.x + language.width).toBeLessThanOrEqual(width);
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    const theme = page.getByRole('group', { name: 'Tema' });
    await expect(theme).toBeVisible();
    const box = (await theme.boundingBox())!;
    const menu = (await page.getByRole('dialog').boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(menu.x + menu.width);
    expect(
      await page
        .getByRole('dialog')
        .evaluate((el) => el.scrollWidth - el.clientWidth),
    ).toBeLessThanOrEqual(0);
  });
}
