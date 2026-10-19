import { expect, test } from './support/test';
import { fillPlace } from './support/propose';

test.use({ viewport: { width: 375, height: 800 } });

// El estilo real vive en OpenFreeMap: aquí, uno vacío para no depender de nadie.
test.beforeEach(async ({ page }) => {
  await page.route('https://tiles.openfreemap.org/**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      json: {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'bg',
            type: 'background',
            paint: { 'background-color': '#eeeeee' },
          },
        ],
      },
    }),
  );
});

const next = (page: import('./support/test').Page) =>
  page.getByRole('button', { name: 'Continuar' }).click();

test('el lugar: país, calle y ciudad son obligatorios', async ({ page }) => {
  await page.goto('/es/propose');
  await page.getByLabel('Nombre del local').fill('Casa Marta');
  await next(page);
  await expect(page.locator('p[role=alert]')).toHaveText([
    'Elige el país donde está el local.',
    'Escribe la calle (y el número, si lo sabes) para poder continuar.',
    'Escribe la ciudad donde está el local.',
  ]);
  await expect(page.getByLabel('País')).toHaveAttribute('aria-invalid', 'true');

  // Basura no vale: la calle tiene que parecer una calle.
  await page.getByLabel('País').selectOption('ES');
  await page.getByLabel('Dirección').fill('12');
  await page.getByLabel('Ciudad').fill('M');
  await next(page);
  await expect(page.locator('p[role=alert]')).toHaveCount(2);

  await page.getByLabel('Dirección').fill('Calle Mayor 5');
  await page.getByLabel('Ciudad').fill('Madrid');
  await next(page);
  await expect(page.getByText('Plato 1')).toBeVisible();
});

test('el lugar: el país se elige por su nombre, en el idioma de la web', async ({
  page,
}) => {
  await page.goto('/es/propose');
  await expect(
    page.getByLabel('País').locator('option', { hasText: 'España' }),
  ).toHaveAttribute('value', 'ES');
  await expect(
    page.getByLabel('País').locator('option', { hasText: 'Cuba' }),
  ).toHaveAttribute('value', 'CU');
  await page.goto('/en/propose');
  await expect(
    page.getByLabel('Country').locator('option', { hasText: 'Spain' }),
  ).toHaveAttribute('value', 'ES');
});

test('el lugar: el código postal se comprueba según el país', async ({
  page,
}) => {
  await page.goto('/es/propose');
  await fillPlace(page, 'Casa Marta');
  await page.getByLabel(/Código postal/).fill('280');
  await next(page);
  await expect(page.locator('p[role=alert]')).toContainText(
    'no parece el de ese país',
  );
  await page.getByLabel(/Código postal/).fill('28013');
  await next(page);
  await expect(page.getByText('Plato 1')).toBeVisible();

  // Portugal escribe 4 cifras, un guion y 3 cifras.
  await page.getByRole('button', { name: 'Atrás' }).click();
  await page.getByLabel('País').selectOption('PT');
  await next(page);
  await expect(page.locator('p[role=alert]')).toBeVisible();
  await page.getByLabel(/Código postal/).fill('1000-001');
  await next(page);
  await expect(page.getByText('Plato 1')).toBeVisible();
});

test('el envío lleva el país, y el pin solo si se colocó', async ({
  page,
  sent,
}) => {
  await page.goto('/es/propose');
  await fillPlace(page, 'Casa Marta');
  for (let i = 0; i < 3; i++) await next(page);
  await expect(page.getByText('Calle Mayor 5, Madrid, España')).toBeVisible();
  await page.getByRole('button', { name: 'Enviar propuesta' }).click();
  await expect(
    page.getByRole('heading', { name: '¡Gracias por proponerlo!' }),
  ).toBeFocused();
  const body = sent.find((s) => s.path === '/proposals')!.body;
  expect(body).toMatchObject({
    street: 'Calle Mayor 5',
    city: 'Madrid',
    country: 'ES',
  });
  expect(body.location).toBeUndefined();
});

test.describe('el pin en el mapa', () => {
  const openMap = async (page: import('./support/test').Page) => {
    await page.getByRole('button', { name: 'Abrir el mapa' }).click();
    await expect(
      page.getByRole('button', { name: 'Poner el pin en el centro del mapa' }),
    ).toBeEnabled();
  };

  test('hace falta el país antes de abrir el mapa', async ({ page }) => {
    await page.goto('/es/propose');
    await page.getByRole('button', { name: 'Abrir el mapa' }).click();
    await expect(page.getByLabel('País')).toBeFocused();
    await expect(page.locator('p[role=alert]')).toContainText('Elige el país');
  });

  test('se pone en el centro, se quita y viaja con la propuesta', async ({
    page,
    sent,
  }) => {
    await page.goto('/es/propose');
    await fillPlace(page, 'Casa Marta');
    await openMap(page);
    await expect(
      page.getByText('Todavía no has colocado el pin.'),
    ).toBeVisible();

    await page
      .getByRole('button', { name: 'Poner el pin en el centro del mapa' })
      .click();
    await expect(page.getByText(/Pin colocado \(/)).toBeVisible();
    await expect(page.locator('.maplibregl-marker')).toHaveCount(1);

    await page.getByRole('button', { name: 'Quitar el pin' }).click();
    await expect(page.locator('.maplibregl-marker')).toHaveCount(0);
    await page
      .getByRole('button', { name: 'Poner el pin en el centro del mapa' })
      .click();
    await expect(page.locator('.maplibregl-marker')).toHaveCount(1);

    for (let i = 0; i < 3; i++) {
      // El mapa se cierra al cambiar de paso; el pin queda en el formulario.
      await next(page);
    }
    await page.getByRole('button', { name: 'Enviar propuesta' }).click();
    await expect(
      page.getByRole('heading', { name: '¡Gracias por proponerlo!' }),
    ).toBeFocused();
    const { location } = sent.find((s) => s.path === '/proposals')!.body as {
      location: { lat: number; lng: number };
    };
    // El mapa abre sobre España: el centro cae dentro de ella.
    expect(location.lat).toBeGreaterThan(36);
    expect(location.lat).toBeLessThan(44);
    expect(location.lng).toBeGreaterThan(-10);
    expect(location.lng).toBeLessThan(5);
  });

  test('tocar el mapa coloca el pin donde se toca', async ({ page }) => {
    await page.goto('/es/propose');
    await fillPlace(page, 'Casa Marta');
    await openMap(page);
    const canvas = page.locator('.maplibregl-canvas');
    const box = (await canvas.boundingBox())!;
    await page.mouse.click(box.x + box.width / 4, box.y + box.height / 4);
    await expect(page.getByText(/Pin colocado \(/)).toBeVisible();
    const before = await page.getByText(/Pin colocado \(/).textContent();

    await page.mouse.click(box.x + (box.width * 3) / 4, box.y + box.height / 2);
    await expect(page.getByText(/Pin colocado \(/)).not.toHaveText(before!);
    await expect(page.locator('.maplibregl-marker')).toHaveCount(1);
  });

  test('con el teclado: flechas para mover el mapa y botón para poner el pin', async ({
    page,
  }) => {
    await page.goto('/es/propose');
    await fillPlace(page, 'Casa Marta');
    await openMap(page);
    const place = page.getByRole('button', {
      name: 'Poner el pin en el centro del mapa',
    });
    await place.click();
    const first = await page.getByText(/Pin colocado \(/).textContent();

    await page.getByLabel(/Mapa para colocar el pin/).focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    // El pan por teclado se anima: se espera a que el mapa llegue.
    await page.waitForTimeout(800);
    await place.click();
    await expect(page.getByText(/Pin colocado \(/)).not.toHaveText(first!);
  });

  test('cambiar de país quita el pin', async ({ page }) => {
    await page.goto('/es/propose');
    await fillPlace(page, 'Casa Marta');
    await openMap(page);
    await page
      .getByRole('button', { name: 'Poner el pin en el centro del mapa' })
      .click();
    await expect(page.getByText(/Pin colocado \(/)).toBeVisible();
    await page.getByLabel('País').selectOption('PT');
    await expect(
      page.getByText('Todavía no has colocado el pin.'),
    ).toBeVisible();
    await expect(page.locator('.maplibregl-marker')).toHaveCount(0);
  });

  test('el país y el pin sobreviven a una recarga (borrador)', async ({
    page,
  }) => {
    await page.goto('/es/propose');
    await fillPlace(page, 'Casa Marta');
    await openMap(page);
    await page
      .getByRole('button', { name: 'Poner el pin en el centro del mapa' })
      .click();
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.localStorage.getItem('hearteats:draft-propose'),
        ),
      )
      .toContain('"location":{');
    await page.reload();
    await expect(page.getByLabel('País')).toHaveValue('ES');
    await expect(
      page.getByText('Has colocado el pin en el mapa.'),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Cambiar el pin en el mapa' }),
    ).toBeVisible();
  });

  test('a 320 px, con una fuente ancha, nada se sale', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/es/propose');
    await page.addStyleTag({
      content: '* { font-family: Verdana !important; }',
    });
    await fillPlace(page, 'Casa Marta');
    await openMap(page);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(0);
  });
});

test('las listas desplegables se dibujan como el resto de campos', async ({
  page,
}) => {
  await page.goto('/es/propose');
  const select = page.getByLabel('País');
  const input = page.getByLabel('Nombre del local');
  const style = (l: typeof select) =>
    l.evaluate((el) => {
      const c = getComputedStyle(el);
      return {
        height: c.height,
        radius: c.borderTopLeftRadius,
        border: c.borderTopWidth,
      };
    });
  expect(await style(select)).toEqual(await style(input));
  await expect(select).toHaveCSS('appearance', 'none');
});
