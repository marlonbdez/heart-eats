import { expect, test } from './support/test';

const DARK_BG = 'rgb(31, 24, 21)';
const LIGHT_BG = 'rgb(251, 245, 234)';

const bodyBg = (page: import('@playwright/test').Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

async function chooseTheme(
  page: import('@playwright/test').Page,
  name: 'Sistema' | 'Claro' | 'Oscuro',
) {
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  const menu = page.getByRole('dialog');
  await menu.getByText(name, { exact: true }).click();
  await menu.getByRole('button', { name: 'Cerrar menú' }).click();
}

for (const width of [320, 390]) {
  test(`cabecera ${width}px (letra ancha): «Proponer» va antes del idioma y todo cabe`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 700 });
    await page.goto('/es');
    await page.addStyleTag({
      content: '* { font-family: Verdana !important; }',
    });
    const propose = (await page
      .getByRole('link', { name: 'Proponer un local' })
      .first()
      .boundingBox())!;
    const language = (await page
      .getByRole('button', { name: /Idioma/ })
      .boundingBox())!;
    expect(propose.x + propose.width).toBeLessThanOrEqual(language.x);
    expect(language.x + language.width).toBeLessThanOrEqual(width);
    const logo = (await page
      .getByRole('link', { name: /HeartEats/ })
      .first()
      .boundingBox())!;
    expect(logo.x + logo.width).toBeLessThanOrEqual(propose.x);
    // El orden del teclado sigue al visual.
    const proposeFirst = await page.evaluate(() => {
      const cta = document.querySelector('header a[href$="/propose"]')!;
      const lang = document.querySelector(
        'header button[aria-label*="Idioma"]',
      )!;
      return !!(
        cta.compareDocumentPosition(lang) & Node.DOCUMENT_POSITION_FOLLOWING
      );
    });
    expect(proposeFirst).toBe(true);
  });
}

test('tema: se elige en el menú, se aplica, se recuerda y «Sistema» lo borra', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/es');
  const html = page.locator('html');
  await expect(html).not.toHaveAttribute('data-theme', /.+/);
  expect(await bodyBg(page)).toBe(LIGHT_BG);

  await chooseTheme(page, 'Oscuro');
  await expect(html).toHaveAttribute('data-theme', 'dark');
  expect(await bodyBg(page)).toBe(DARK_BG);
  expect(
    await page.evaluate(() => localStorage.getItem('hearteats:theme')),
  ).toBe('dark');

  // Al recargar (y en otra página) ya viene aplicado, sin esperar a la hidratación.
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  expect(await bodyBg(page)).toBe(DARK_BG);
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await expect(page.getByRole('radio', { name: 'Oscuro' })).toBeChecked();
  await page.getByRole('button', { name: 'Cerrar menú' }).click();

  await chooseTheme(page, 'Sistema');
  await expect(html).not.toHaveAttribute('data-theme', /.+/);
  expect(
    await page.evaluate(() => localStorage.getItem('hearteats:theme')),
  ).toBeNull();
  expect(await bodyBg(page)).toBe(LIGHT_BG);
});

test('tema: «Claro» manda sobre un dispositivo en oscuro', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/es');
  expect(await bodyBg(page)).toBe(DARK_BG);
  await chooseTheme(page, 'Claro');
  expect(await bodyBg(page)).toBe(LIGHT_BG);
});

test('tema: el mapa cambia de estilo con la elección', async ({ page }) => {
  const styles: string[] = [];
  page.on('request', (r) => {
    if (r.url().startsWith('https://tiles.openfreemap.org/styles/'))
      styles.push(r.url().split('/').at(-1)!);
  });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.route('https://tiles.openfreemap.org/**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      json: { version: 8, sources: {}, layers: [] },
    }),
  );
  await page.goto('/es/map');
  await expect(page.locator('[data-marker]').first()).toBeVisible();
  expect(styles).toContain('positron');
  await chooseTheme(page, 'Oscuro');
  await expect.poll(() => styles).toContain('dark');
});

test('tema: sin almacenamiento sigue funcionando (solo no se recuerda)', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('bloqueado');
      },
    });
  });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/es');
  await chooseTheme(page, 'Oscuro');
  expect(await bodyBg(page)).toBe(DARK_BG);
});

test('el menú tiene el tema también en inglés', async ({ page }) => {
  await page.goto('/en');
  await page.getByRole('button', { name: 'Open menu' }).click();
  const menu = page.getByRole('dialog');
  await expect(menu.getByRole('group', { name: 'Theme' })).toBeVisible();
  await expect(menu.getByRole('radio', { name: 'System' })).toBeChecked();
});
