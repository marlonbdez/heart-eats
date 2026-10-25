import { expect, test } from './support/test';
import type { Page } from '@playwright/test';

const group = (page: Page) =>
  page.getByRole('group', { name: 'Tipo de comida' });
const chips = (page: Page) => group(page).getByRole('button');
const next = (page: Page) =>
  page.getByRole('button', { name: 'Categorías siguientes' });
const previous = (page: Page) =>
  page.getByRole('button', { name: 'Categorías anteriores' });
const scrolled = (page: Page) =>
  group(page).evaluate((el) => Math.round(el.scrollLeft));

test.describe('categorías de la zona', () => {
  test('cada zona enseña solo las categorías con locales, de más a menos', async ({
    page,
  }) => {
    await page.goto('/es');
    await expect(chips(page).first()).toBeVisible();
    // Madrid tiene de todo menos sushi (ese local está en Tokio).
    await expect(
      group(page).getByRole('button', { name: 'Pizza' }),
    ).toBeVisible();
    await expect(
      group(page).getByRole('button', { name: 'Sushi' }),
    ).toHaveCount(0);
    await expect(
      group(page).getByRole('button', { name: 'Marisquería' }),
    ).toHaveCount(0);

    // Café sale en varios locales y Árabe en uno: Café va antes.
    const names = await chips(page).allInnerTexts();
    const cafe = names.findIndex((n) => n.includes('Café'));
    const arab = names.findIndex((n) => n.includes('Árabe'));
    expect(cafe).toBeLessThan(arab);

    await page.goto('/es?country=JP&city=' + encodeURIComponent('東京'));
    await expect(chips(page)).toHaveCount(1);
    await expect(chips(page).first()).toContainText('Sushi');
  });

  test('una categoría elegida sigue a la vista aunque la zona no tenga locales de ella', async ({
    page,
  }) => {
    await page.goto('/es?food=sushi');
    const sushi = group(page).getByRole('button', { name: 'Sushi' });
    await expect(sushi).toHaveAttribute('aria-pressed', 'true');
    // Quitarla la retira de la fila: ya no hay nada que elegir en esa zona.
    await sushi.click();
    await expect(sushi).toHaveCount(0);
  });

  test('las nuevas categorías filtran', async ({ page }) => {
    await page.goto('/es');
    await group(page).getByRole('button', { name: 'Vegano' }).click();
    const cards = page
      .getByRole('list', { name: 'Lista de locales' })
      .getByRole('listitem');
    await expect(cards).toHaveCount(1);
  });

  test('en inglés se llaman como corresponde', async ({ page }) => {
    await page.goto('/en');
    const row = page.getByRole('group', { name: 'Type of food' });
    await expect(
      row.getByRole('button', { name: 'Breakfast & brunch' }),
    ).toBeVisible();
    await expect(
      row.getByRole('button', { name: 'Latin American' }),
    ).toHaveCount(0);
  });
});

test.describe('flechas con ratón', () => {
  test.use({
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 1,
    viewport: { width: 1280, height: 800 },
  });

  test('salen donde hay más categorías y desplazan la fila', async ({
    page,
  }) => {
    await page.goto('/es');
    await expect(chips(page).first()).toBeVisible();
    // Al principio solo hay más por la derecha.
    await expect(next(page)).toBeVisible();
    await expect(previous(page)).toHaveCount(0);
    expect(await scrolled(page)).toBeLessThanOrEqual(4);

    await next(page).click();
    await expect.poll(() => scrolled(page)).toBeGreaterThan(200);
    await expect(previous(page)).toBeVisible();

    // Hasta el final: ya no hay más a la derecha. Cada clic se espera a que el
    // desplazamiento suave termine antes del siguiente (en el CI va más lento).
    for (let i = 0; i < 12 && (await next(page).count()); i++) {
      // Si la flecha desaparece justo antes del clic, ya se llegó al final.
      await next(page)
        .click({ timeout: 2000 })
        .catch(() => undefined);
      let last = -1;
      await expect
        .poll(
          async () => {
            const now = await scrolled(page);
            const still = now === last;
            last = now;
            return still;
          },
          { intervals: [150] },
        )
        .toBe(true);
    }
    await expect(next(page)).toHaveCount(0);
    await expect(previous(page)).toBeVisible();

    await previous(page).click();
    await expect(next(page)).toBeVisible();
  });

  test('no salen si todas caben', async ({ page }) => {
    await page.goto('/es?country=JP&city=' + encodeURIComponent('東京'));
    await expect(chips(page)).toHaveCount(1);
    await expect(next(page)).toHaveCount(0);
    await expect(previous(page)).toHaveCount(0);
  });

  test('con el teclado se llega a todas sin las flechas', async ({ page }) => {
    await page.goto('/es');
    const last = chips(page).last();
    await expect(last).not.toBeInViewport();
    // Las flechas son solo para el ratón: no añaden paradas al tabulador.
    await expect(next(page)).toHaveAttribute('tabindex', '-1');
    await last.focus();
    await expect(last).toBeInViewport();
  });
});

for (const width of [320, 390]) {
  test(`móvil ${width}px: se desliza con el dedo, sin flechas y sin desbordar la página`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 700 });
    await page.goto('/es');
    await page.addStyleTag({
      content: '* { font-family: Verdana !important; }',
    });
    await expect(chips(page).first()).toBeVisible();
    // Hay más de las que caben, pero sin flechas (solo táctil).
    expect(
      await group(page).evaluate((el) => el.scrollWidth > el.clientWidth),
    ).toBe(true);
    await expect(next(page)).toBeHidden();
    await expect(previous(page)).toBeHidden();
    // El degradado del borde avisa de que hay más.
    await expect(group(page)).toHaveAttribute('data-more-after', 'true');
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(0);
  });
}
