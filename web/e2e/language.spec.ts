import { expect, test } from './support/test';

const KEY = 'hearteats:language';

test.describe('idioma de entrada desde la raíz', () => {
  test.describe('navegador en español (México)', () => {
    test.use({ locale: 'es-MX' });
    test('va a /es', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveURL(/\/es\/?$/);
    });
  });

  test.describe('navegador en francés', () => {
    test.use({ locale: 'fr-FR' });
    test('sin idioma propio, inglés', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveURL(/\/en\/?$/);
    });
  });

  test.describe('navegador en español', () => {
    test.use({ locale: 'es-ES' });
    test('lo elegido antes manda sobre el navegador', async ({ page }) => {
      await page.goto('/es');
      await page.evaluate((k) => window.localStorage.setItem(k, 'en'), KEY);
      await page.goto('/');
      await expect(page).toHaveURL(/\/en\/?$/);
    });

    test('un valor guardado que no es un idioma se ignora', async ({
      page,
    }) => {
      await page.goto('/es');
      await page.evaluate((k) => window.localStorage.setItem(k, 'xx'), KEY);
      await page.goto('/');
      await expect(page).toHaveURL(/\/es\/?$/);
    });
  });
});

test.describe('selector de idioma de la cabecera', () => {
  test.use({ locale: 'es-ES' });

  test('está a la vista, sin abrir el menú, y recuerda lo que se elige', async ({
    page,
  }) => {
    await page.goto('/es');
    const button = page.getByRole('button', { name: 'ES · Idioma' });
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('button', { name: 'English' })).toBeHidden();

    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('button', { name: 'Español' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    await page.getByRole('button', { name: 'English' }).click();

    await expect(page).toHaveURL(/\/en\/?$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(
      page.getByRole('button', { name: 'EN · Language' }),
    ).toBeVisible();
    expect(
      await page.evaluate((k) => window.localStorage.getItem(k), KEY),
    ).toBe('en');

    // La próxima visita a la raíz respeta la elección, aunque el navegador
    // esté en español.
    await page.goto('/');
    await expect(page).toHaveURL(/\/en\/?$/);
  });

  test('abrir una ficha por enlace no cambia el idioma guardado', async ({
    page,
  }) => {
    await page.goto('/en/list');
    expect(
      await page.evaluate((k) => window.localStorage.getItem(k), KEY),
    ).toBeNull();
  });

  test('se cierra con Escape (y el foco vuelve al botón) y al pulsar fuera', async ({
    page,
  }) => {
    await page.goto('/es');
    const button = page.getByRole('button', { name: 'ES · Idioma' });
    await button.click();
    await expect(page.getByRole('button', { name: 'English' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'English' })).toBeHidden();
    await expect(button).toBeFocused();

    await button.click();
    await page.mouse.click(10, 400);
    await expect(page.getByRole('button', { name: 'English' })).toBeHidden();
  });

  test('sin almacenamiento, cambia de idioma igualmente', async ({ page }) => {
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new Error('bloqueado');
      };
    });
    await page.goto('/es');
    await page.getByRole('button', { name: 'ES · Idioma' }).click();
    await page.getByRole('button', { name: 'English' }).click();
    await expect(page).toHaveURL(/\/en\/?$/);
  });

  for (const [label, family] of [
    ['fuente normal', ''],
    ['fuente ancha', 'Verdana, sans-serif'],
  ]) {
    test(`a 320 px la cabecera cabe (${label})`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 700 });
      await page.goto('/es');
      if (family) {
        await page.addStyleTag({
          content: `body, button, a { font-family: ${family} !important; }`,
        });
      }
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow).toBe(false);
      const boxes = await Promise.all(
        [
          page.getByRole('button', { name: 'ES · Idioma' }),
          page.getByRole('link', { name: 'Proponer un local' }),
        ].map((l) => l.boundingBox()),
      );
      const [lang, cta] = boxes;
      // «Proponer» va antes y el idioma al borde, sin pisarse.
      expect(cta!.x + cta!.width).toBeLessThanOrEqual(lang!.x + 1);
      expect(lang!.x + lang!.width).toBeLessThanOrEqual(320);
    });
  }
});
