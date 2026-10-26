import { expect, test, type Page } from './support/test';
import { fillPlace } from './support/propose';

test.use({ viewport: { width: 375, height: 800 } });

const overflow = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

const toDishes = async (page: Page) => {
  await page.goto('/es/propose');
  await fillPlace(page, 'Casa Marta');
  await page.getByRole('button', { name: 'Continuar' }).click();
};

test.describe('la ficha', () => {
  test('el precio sale junto al nombre del plato que lo tiene', async ({
    page,
  }) => {
    await page.goto('/es/place/demo-la-masa-madre');
    const dishes = page.locator('#platos + ul > li');
    await expect(dishes.first()).toContainText('Margarita de la casa');
    await expect(dishes.first()).toContainText('9,50 €');
    // Un plato sin precio no lleva nada en su lugar.
    await expect(dishes.nth(1)).toContainText('Focaccia de romero');
    await expect(dishes.nth(1)).not.toContainText('€');
  });

  test('en 320 px cabe, también con letra ancha', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/es/place/demo-la-masa-madre');
    await page.addStyleTag({
      content: '* { font-family: Verdana !important; }',
    });
    await expect(page.getByText('9,50 €')).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
});

test.describe('proponer un local', () => {
  test('cada plato admite un precio, opcional, que viaja con la propuesta', async ({
    page,
    sent,
  }) => {
    await toDishes(page);
    await page.getByLabel('Nombre del plato').fill('Tortilla');
    await page.getByLabel(/^Precio/).fill('8,50 €');
    await page.getByRole('button', { name: '+ Añadir otro plato' }).click();
    await page.locator('#d1n').fill('Croquetas');
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: 'Continuar' }).click();
    }
    await page.getByRole('button', { name: 'Enviar propuesta' }).click();
    await expect(
      page.getByRole('heading', { name: '¡Gracias por proponerlo!' }),
    ).toBeFocused();
    const { dishes } = sent.find((s) => s.path === '/proposals')!.body as {
      dishes: { name: string; price?: string }[];
    };
    expect(dishes).toMatchObject([
      { name: 'Tortilla', price: '8,50 €' },
      { name: 'Croquetas' },
    ]);
    expect(dishes[1]!.price).toBeUndefined();
  });

  test('el precio admite como mucho 20 caracteres', async ({ page }) => {
    await toDishes(page);
    const price = page.getByLabel(/^Precio/);
    await price.fill('1234567890123456789012345');
    await expect(price).toHaveValue('12345678901234567890');
  });

  test('el borrador recuerda el precio del plato', async ({ page }) => {
    await toDishes(page);
    await page.getByLabel('Nombre del plato').fill('Tortilla');
    await page.getByLabel(/^Precio/).fill('¥900');
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.localStorage.getItem('hearteats:draft-propose'),
        ),
      )
      .toContain('¥900');
    await page.reload();
    // Hasta que se recupera el borrador el formulario está en el paso 1.
    await expect(page.getByRole('status')).toContainText(
      'recuperado el borrador',
    );
    await expect(page.getByLabel(/^Precio/)).toHaveValue('¥900');
  });

  test('en 320 px el paso de los platos cabe, también con letra ancha', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await toDishes(page);
    await page.addStyleTag({
      content: '* { font-family: Verdana !important; }',
    });
    await expect(page.getByLabel(/^Precio/)).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
});

test('Moderación ve el precio junto al nombre del plato', async ({
  page,
  session,
}) => {
  session.role = 'admin';
  await page.goto('/es/moderation');
  await page.getByRole('button', { name: /Casa Marta/ }).click();
  await expect(page.getByText('Tortilla (8,50 €)')).toBeVisible();
});
