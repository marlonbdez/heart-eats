import { expect, test, type Page } from './support/test';

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

test('el menú lateral lleva el idioma y el tema como filas con su valor', async ({
  page,
}) => {
  await page.goto('/es');
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  const menu = page.getByRole('dialog', { name: 'Menú' });

  const language = menu.getByRole('button', { name: /^Idioma/ });
  await expect(language).toContainText('Español');
  await expect(language).toHaveAttribute('aria-haspopup', 'dialog');
  const theme = menu.getByRole('button', { name: /^Tema:/ });
  await expect(theme).toContainText('Claro');
  // Cada fila lleva su icono y es un botón táctil.
  for (const row of [language, theme]) {
    await expect(row.locator('svg')).toBeVisible();
    expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
});

test('elegir idioma en el menú abre un diálogo, lo cambia, lo recuerda y conserva la búsqueda', async ({
  page,
}) => {
  await page.goto('/es?q=lavapies');
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await page
    .getByRole('dialog', { name: 'Menú' })
    .getByRole('button', { name: /^Idioma/ })
    .click();
  const picker = page.getByRole('dialog', { name: 'Idioma' });
  await expect(picker.getByRole('button', { name: 'Español' })).toHaveAttribute(
    'aria-current',
    'true',
  );
  await picker.getByRole('button', { name: 'English' }).click();
  await expect(page).toHaveURL(/\/en\?q=lavapies$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('searchbox')).toHaveValue('lavapies');
  expect(
    await page.evaluate(() => localStorage.getItem('hearteats:language')),
  ).toBe('en');
  // El diálogo y el menú se cierran al cambiar y ahora marca English.
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Menu' }).getByRole('button', {
      name: /^Language/,
    }),
  ).toContainText('English');
});

test('el diálogo de idiomas se cierra con Escape y con el botón, sin cerrar el menú', async ({
  page,
}) => {
  await page.goto('/es');
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  const row = page.getByRole('button', { name: /^Idioma/ });
  await row.click();
  const picker = page.getByRole('dialog', { name: 'Idioma' });
  await expect(picker).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(picker).toBeHidden();
  await expect(page.getByRole('dialog', { name: 'Menú' })).toBeVisible();
  await expect(row).toBeFocused();

  await row.click();
  await picker
    .getByRole('button', { name: 'Cerrar la lista de idiomas' })
    .click();
  await expect(picker).toBeHidden();
  await expect(page.getByRole('dialog', { name: 'Menú' })).toBeVisible();
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
    const theme = page.getByRole('button', { name: /^Tema:/ });
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

// El menú agrupa por lo que se hace: navegar, participar y saber más.
const menuGroup = (page: Page, name: string) =>
  page
    .getByRole('dialog', { name: /^Men[uú]$/ })
    .locator('section')
    .filter({ has: page.getByRole('heading', { name, exact: true }) });

test('«Pedir una retirada» y «Cuenta tu equipo» están en «Colaborar»', async ({
  page,
}) => {
  await page.goto('/es');
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  const take = menuGroup(page, 'Colaborar');
  await expect(take.getByRole('link')).toHaveText([
    'Proponer un local',
    'Corregir un dato',
    'Pedir una retirada',
    'Cuenta tu equipo',
    'Cómo ayudar',
  ]);
  // Ya no está entre los textos de «Sobre HeartEats».
  await expect(
    menuGroup(page, 'Sobre HeartEats').getByRole('link', {
      name: 'Pedir una retirada',
    }),
  ).toHaveCount(0);

  await take.getByRole('link', { name: 'Cuenta tu equipo' }).click();
  await expect(page).toHaveURL(/\/es\/business$/);
  await expect(
    page.getByRole('heading', { name: 'Cuenta tu equipo', level: 1 }),
  ).toBeVisible();
});

test('en pantalla ancha el menú tiene una sola entrada para lista y mapa', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/es');
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  const browse = menuGroup(page, 'Navegar');
  await expect(browse.getByRole('link')).toHaveText(['Explorar locales']);
  await expect(
    browse.getByRole('link', { name: 'Explorar locales' }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(
    browse.getByRole('link', { name: 'Explorar locales' }),
  ).toHaveAttribute('href', '/es');

  // En el mapa sigue siendo la misma pantalla.
  await page.goto('/es/map');
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await expect(
    menuGroup(page, 'Navegar').getByRole('link', { name: 'Explorar locales' }),
  ).toHaveAttribute('aria-current', 'page');
});

test('en el móvil el menú sigue teniendo Lista de locales y Mapa por separado', async ({
  page,
}) => {
  await page.goto('/es');
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await expect(menuGroup(page, 'Navegar').getByRole('link')).toHaveText([
    'Lista de locales',
    'Mapa',
  ]);
});

test('el menú existe en inglés con las mismas agrupaciones', async ({
  page,
}) => {
  await page.goto('/en');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(
    menuGroup(page, 'Contribute').getByRole('link', {
      name: 'Ask for a removal',
    }),
  ).toBeVisible();
  await expect(
    menuGroup(page, 'Contribute').getByRole('link', {
      name: 'Tell us about your team',
    }),
  ).toBeVisible();
});
