import { API, expect, test } from './support/test';

const markers = (page: import('@playwright/test').Page) =>
  page.locator('[data-marker]');

test.describe('zona que se mira', () => {
  test('arranca en la ciudad con más locales y el selector lista países y ciudades', async ({
    page,
  }) => {
    await page.goto('/es');
    await expect(markers(page)).toHaveCount(6);
    const button = page.getByRole('button', { name: /Zona: Madrid, España/ });
    await expect(button).toBeVisible();

    await button.click();
    const dialog = page.getByRole('dialog', { name: '¿Dónde?' });
    await expect(dialog.getByRole('heading', { name: 'España' })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Japón' })).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: /Madrid.*6 locales/ }),
    ).toHaveAttribute('aria-current', 'true');
    await expect(
      dialog.getByRole('button', { name: /Barcelona/ }),
    ).toBeVisible();
    await expect(dialog.getByRole('button', { name: /東京/ })).toBeVisible();
  });

  test('los países salen en el idioma de la interfaz', async ({ page }) => {
    await page.goto('/en');
    await page.getByRole('button', { name: /Area: Madrid, Spain/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Where?' });
    await expect(dialog.getByRole('heading', { name: 'Spain' })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Japan' })).toBeVisible();
  });

  test('elegir otra ciudad cambia los locales, la dirección y el mapa', async ({
    page,
  }) => {
    await page.goto('/es');
    await expect(markers(page)).toHaveCount(6);
    await page.getByRole('button', { name: /Zona: Madrid/ }).click();
    await page.getByRole('button', { name: /Barcelona/ }).click();

    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page).toHaveURL(/\?country=ES&city=barcelona$/);
    await expect(markers(page)).toHaveCount(2);
    await expect(
      page.getByRole('button', { name: /Zona: Barcelona, España/ }),
    ).toBeVisible();

    // El mapa se encuadra en la ciudad: sus dos marcadores están a la vista.
    for (const slug of ['demo-cafe-del-mar', 'demo-forn-gotic']) {
      await expect(page.locator(`[data-marker="${slug}"]`)).toBeInViewport();
    }
  });

  test('el buscador del selector encuentra por ciudad y por país, sin acentos', async ({
    page,
  }) => {
    await page.goto('/es');
    await page.getByRole('button', { name: /Zona: Madrid/ }).click();
    const dialog = page.getByRole('dialog');
    const search = dialog.getByRole('searchbox', {
      name: 'Buscar una ciudad o un país',
    });

    await search.fill('japon');
    await expect(dialog.getByRole('button', { name: /東京/ })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Madrid/ })).toBeHidden();

    await search.fill('barcel');
    await expect(
      dialog.getByRole('button', { name: /Barcelona/ }),
    ).toBeVisible();
    await expect(dialog.getByRole('button', { name: /東京/ })).toBeHidden();

    await search.fill('zzzz');
    await expect(
      dialog.getByText(/No hay locales en ninguna zona/),
    ).toBeVisible();
  });

  test('la zona de la dirección se respeta; una que no existe, se ignora', async ({
    page,
  }) => {
    await page.goto('/es?country=JP&city=' + encodeURIComponent('東京'));
    await expect(markers(page)).toHaveCount(1);
    await expect(
      page.getByRole('button', { name: /Zona: 東京, Japón/ }),
    ).toBeVisible();

    await page.goto('/es?country=FR&city=paris');
    await expect(markers(page)).toHaveCount(6);
    await expect(
      page.getByRole('button', { name: /Zona: Madrid/ }),
    ).toBeVisible();
  });

  test('la zona se mantiene al ir a una ficha y volver a la lista', async ({
    page,
  }) => {
    await page.goto('/es/list?country=ES&city=barcelona');
    await expect(page.getByRole('listitem')).toHaveCount(2);
    await page.getByRole('link', { name: 'Ver local →' }).first().click();
    await expect(page).toHaveURL(/\/es\/place\/demo-/);
    await page
      .getByRole('link', { name: /Volver/ })
      .first()
      .click();
    await expect(page).toHaveURL(/country=ES&city=barcelona/);
    await expect(page.getByRole('listitem')).toHaveCount(2);
  });

  test('con una sola zona con locales, solo hay una etiqueta', async ({
    page,
  }) => {
    await page.route(`${API}/regions`, (route) =>
      route.fulfill({
        headers: { 'access-control-allow-origin': '*' },
        json: {
          countries: [
            {
              code: 'ES',
              count: 6,
              bbox: { west: -3.72, south: 40.4, east: -3.65, north: 40.45 },
              cities: [
                {
                  key: 'madrid',
                  name: 'Madrid',
                  count: 6,
                  bbox: { west: -3.72, south: 40.4, east: -3.65, north: 40.45 },
                  center: { lat: 40.42, lng: -3.69 },
                },
              ],
            },
          ],
        },
      }),
    );
    await page.goto('/es');
    await expect(markers(page)).toHaveCount(6);
    await expect(page.getByText('Madrid', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Zona:/ })).toHaveCount(0);
  });

  test('si falla la carga de una zona, avisa, deja el mapa y permite reintentar', async ({
    page,
  }) => {
    await page.goto('/es');
    await expect(markers(page)).toHaveCount(6);

    let failing = true;
    await page.route(`${API}/restaurants?**`, (route) =>
      failing ? route.fulfill({ status: 503, body: '' }) : route.fallback(),
    );
    await page.getByRole('button', { name: /Zona: Madrid/ }).click();
    await page.getByRole('button', { name: /Barcelona/ }).click();
    // (Next añade su propio aviso de rutas, también con rol alert.)
    const alert = page
      .getByRole('alert')
      .filter({ has: page.getByRole('button', { name: 'Reintentar' }) });
    await expect(alert).toBeVisible();

    failing = false;
    await alert.getByRole('button', { name: 'Reintentar' }).click();
    await expect(markers(page)).toHaveCount(2);
    await expect(alert).toHaveCount(0);
  });

  test('sin ninguna zona con locales, lo dice con calma', async ({ page }) => {
    await page.route(`${API}/regions`, (route) =>
      route.fulfill({
        headers: { 'access-control-allow-origin': '*' },
        json: { countries: [] },
      }),
    );
    await page.goto('/es');
    await expect(
      page.getByRole('heading', { name: /Todavía no hay locales/ }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Zona:/ })).toHaveCount(0);
  });

  for (const [label, family] of [
    ['fuente normal', ''],
    ['fuente ancha', 'Verdana, sans-serif'],
  ]) {
    test(`a 320 px el selector y el buscador caben (${label})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 700 });
      await page.goto('/es?country=ES&city=barcelona');
      if (family) {
        await page.addStyleTag({
          content: `body, button, input, a { font-family: ${family} !important; }`,
        });
      }
      await expect(markers(page)).toHaveCount(2);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow).toBe(false);
      const zone = await page
        .getByRole('button', { name: /Zona:/ })
        .boundingBox();
      const search = await page.getByRole('searchbox').boundingBox();
      expect(zone!.x + zone!.width).toBeLessThanOrEqual(search!.x + 1);
      expect(search!.x + search!.width).toBeLessThanOrEqual(320);
      expect(search!.width).toBeGreaterThan(120);
    });
  }
});

test.describe('«Cerca de mí» y las zonas', () => {
  test.use({ permissions: ['geolocation'] });

  test('desde otra ciudad con locales, lleva a su zona', async ({
    context,
    page,
  }) => {
    await context.setGeolocation({ latitude: 41.3851, longitude: 2.1734 });
    await page.goto('/es');
    await expect(markers(page)).toHaveCount(6);
    await page.getByRole('button', { name: 'Cerca de mí' }).click();

    await expect(
      page.getByRole('button', { name: /Zona: Barcelona/ }),
    ).toBeVisible();
    await expect(markers(page)).toHaveCount(2);
    await expect(page).toHaveURL(/city=barcelona/);
    await expect(page.getByRole('img', { name: 'Tu ubicación' })).toBeVisible();
  });
});
