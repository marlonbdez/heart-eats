import { expect, test, type Page } from './support/test';
import { fillPlace } from './support/propose';

test.use({ viewport: { width: 375, height: 800 } });

const overflow = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

test.describe('la ficha', () => {
  test('dice el precio medio junto al tipo de local y enlaza a la carta', async ({
    page,
  }) => {
    await page.goto('/es/place/demo-la-masa-madre');
    await expect(
      page.getByText(/Restaurante · Precio moderado · /),
    ).toBeVisible();

    const menu = page
      .getByRole('navigation', { name: 'Acciones' })
      .getByRole('link', { name: 'Ver la carta' });
    await expect(menu).toHaveAttribute(
      'href',
      'https://masamadre.example/carta',
    );
    // Es la web del propio local: se abre fuera y sin pasar datos.
    await expect(menu).toHaveAttribute('target', '_blank');
    await expect(menu).toHaveAttribute('rel', /noopener/);
  });

  test('sin precio ni carta no se muestra nada de eso', async ({ page }) => {
    await page.goto('/es/place/demo-sakura-shokudo');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/Precio/)).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Ver la carta' })).toHaveCount(
      0,
    );
  });

  test('está en inglés', async ({ page }) => {
    await page.goto('/en/place/demo-la-masa-madre');
    await expect(page.getByText(/Moderate prices/)).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'See the menu' }),
    ).toBeVisible();
  });

  test('en 320 px cabe, también con letra ancha', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/es/place/demo-la-masa-madre');
    await page.addStyleTag({
      content: '* { font-family: Verdana !important; }',
    });
    await expect(
      page.getByRole('link', { name: 'Ver la carta' }),
    ).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
});

test.describe('proponer un local', () => {
  const price = (page: Page) =>
    page.getByRole('group', { name: /Precio medio por persona/ });

  test('el precio y la carta son opcionales y viajan con la propuesta', async ({
    page,
    sent,
  }) => {
    await page.goto('/es/propose');
    await fillPlace(page, 'Casa Marta');

    const moderate = price(page).getByRole('button', { name: 'Moderado' });
    await moderate.click();
    await expect(moderate).toHaveAttribute('aria-pressed', 'true');
    // Pulsar otro cambia la elección; pulsar el mismo la quita.
    await price(page).getByRole('button', { name: 'Alto' }).click();
    await expect(moderate).toHaveAttribute('aria-pressed', 'false');
    await price(page).getByRole('button', { name: 'Económico' }).click();

    await page
      .getByLabel(/Carta del local/)
      .fill('https://casamarta.example/carta');
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: 'Continuar' }).click();
    }
    await page.getByRole('button', { name: 'Enviar propuesta' }).click();
    await expect(
      page.getByRole('heading', { name: '¡Gracias por proponerlo!' }),
    ).toBeFocused();

    expect(sent.find((s) => s.path === '/proposals')!.body).toMatchObject({
      priceRange: 1,
      menuUrl: 'https://casamarta.example/carta',
    });
  });

  test('sin rellenarlos, la propuesta no los lleva', async ({ page, sent }) => {
    await page.goto('/es/propose');
    await fillPlace(page, 'Casa Marta');
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: 'Continuar' }).click();
    }
    await page.getByRole('button', { name: 'Enviar propuesta' }).click();
    await expect(
      page.getByRole('heading', { name: '¡Gracias por proponerlo!' }),
    ).toBeFocused();
    const body = sent.find((s) => s.path === '/proposals')!.body;
    expect(body.priceRange).toBeUndefined();
    expect(body.menuUrl).toBeUndefined();
  });

  test('la carta tiene que ser https', async ({ page }) => {
    await page.goto('/es/propose');
    await fillPlace(page, 'Casa Marta');
    const menu = page.getByLabel(/Carta del local/);
    await menu.fill('http://casamarta.example/carta');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.locator('p[role=alert]')).toContainText('https://');
    await expect(menu).toHaveAttribute('aria-invalid', 'true');

    await menu.fill('https://casamarta.example/carta');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByText('Plato 1')).toBeVisible();
  });

  test('el borrador recuerda el precio y la carta', async ({ page }) => {
    await page.goto('/es/propose');
    await fillPlace(page, 'Casa Marta');
    await price(page).getByRole('button', { name: 'Alto' }).click();
    await page
      .getByLabel(/Carta del local/)
      .fill('https://casamarta.example/carta');
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.localStorage.getItem('hearteats:draft-propose'),
        ),
      )
      .toContain('casamarta.example');

    await page.reload();
    await expect(
      price(page).getByRole('button', { name: 'Alto' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByLabel(/Carta del local/)).toHaveValue(
      'https://casamarta.example/carta',
    );
  });

  test('en 320 px cabe, también con letra ancha', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/es/propose');
    await page.addStyleTag({
      content: '* { font-family: Verdana !important; }',
    });
    await expect(price(page)).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
});

test.describe('moderación', () => {
  test('una propuesta muestra el precio y la carta que dio quien propone', async ({
    page,
    session,
  }) => {
    session.role = 'admin';
    await page.goto('/es/moderation');
    await page.getByRole('button', { name: /Casa Marta/ }).click();
    await expect(page.getByText('Precio económico')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'https://casamarta.example/carta' }),
    ).toHaveAttribute('target', '_blank');
  });

  test('una corrección puede poner el precio y la carta', async ({
    page,
    sent,
    session,
  }) => {
    session.role = 'admin';
    await page.goto('/es/moderation');
    await page
      .getByRole('button', { name: /Corrección.*Café Paso a Paso/s })
      .click();
    await page.getByLabel('He comprobado que el cambio es correcto').check();

    await page
      .getByLabel('Carta del local (enlace https)')
      .fill('http://x.example');
    await page.getByRole('button', { name: 'Aprobar cambio' }).click();
    await expect(page.locator('p[role=alert]')).toContainText('https://');

    await page
      .getByLabel('Precio medio')
      .selectOption({ label: 'Precio alto' });
    await page
      .getByLabel('Carta del local (enlace https)')
      .fill('https://paso.example/carta');
    await page.getByRole('button', { name: 'Aprobar cambio' }).click();
    await expect(page.getByRole('status')).toHaveText('Cambio aplicado');
    expect(sent).toEqual([
      {
        path: '/suggestions/s3/decision',
        body: {
          action: 'approve',
          priceRange: 3,
          menuUrl: 'https://paso.example/carta',
        },
      },
    ]);
  });
});
