import { API, chooseNearMe, expect, test } from './support/test';

const markers = (page: import('@playwright/test').Page) =>
  page.locator('[data-marker]');

test.describe('zona que se mira', () => {
  test('arranca en la ciudad con más locales y el selector lista países y ciudades', async ({
    page,
  }) => {
    await page.goto('/es/map');
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
    await expect(dialog.getByRole('button', { name: /Tokio/ })).toBeVisible();
  });

  test('los países salen en el idioma de la interfaz', async ({ page }) => {
    await page.goto('/en/map');
    await page.getByRole('button', { name: /Area: Madrid, Spain/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Where?' });
    await expect(dialog.getByRole('heading', { name: 'Spain' })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Japan' })).toBeVisible();
  });

  test('elegir otra ciudad cambia los locales, la dirección y el mapa', async ({
    page,
  }) => {
    await page.goto('/es/map');
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
    await page.goto('/es/map');
    await page.getByRole('button', { name: /Zona: Madrid/ }).click();
    const dialog = page.getByRole('dialog');
    const search = dialog.getByRole('searchbox', {
      name: 'Buscar una ciudad o un país',
    });

    await search.fill('japon');
    await expect(dialog.getByRole('button', { name: /Tokio/ })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Madrid/ })).toBeHidden();

    await search.fill('barcel');
    await expect(
      dialog.getByRole('button', { name: /Barcelona/ }),
    ).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Tokio/ })).toBeHidden();

    await search.fill('zzzz');
    await expect(
      dialog.getByText(/No hay locales en ninguna zona/),
    ).toBeVisible();
  });

  test('las ciudades salen en el idioma de la interfaz y se buscan por cualquiera de sus nombres', async ({
    page,
  }) => {
    await page.goto('/en/map');
    await page.getByRole('button', { name: /Area: Madrid/ }).click();
    const dialog = page.getByRole('dialog');
    const search = dialog.getByRole('searchbox');
    await expect(dialog.getByRole('button', { name: /Tokyo/ })).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: /Tokio|東京/ }),
    ).toHaveCount(0);

    // Por el nombre de otro idioma o por el local, también.
    for (const text of ['tokio', '東京', 'tokyo']) {
      await search.fill(text);
      await expect(dialog.getByRole('button', { name: /Tokyo/ })).toBeVisible();
      await expect(dialog.getByRole('button', { name: /Madrid/ })).toBeHidden();
    }

    await dialog.getByRole('button', { name: /Tokyo/ }).click();
    await expect(
      page.getByRole('button', { name: /Area: Tokyo, Japan/ }),
    ).toBeVisible();
  });

  test('la zona de la dirección se respeta; una que no existe, se ignora', async ({
    page,
  }) => {
    await page.goto('/es/map?country=JP&city=' + encodeURIComponent('東京'));
    await expect(markers(page)).toHaveCount(1);
    await expect(
      page.getByRole('button', { name: /Zona: Tokio, Japón/ }),
    ).toBeVisible();

    await page.goto('/es/map?country=FR&city=paris');
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
    await page
      .getByRole('list', { name: 'Lista de locales' })
      .getByRole('link')
      .first()
      .click();
    await expect(page).toHaveURL(/\/es\/place\/demo-/);
    await page
      .getByRole('link', { name: /Volver/ })
      .first()
      .click();
    await expect(page).toHaveURL(/country=ES&city=barcelona/);
    await expect(page.getByRole('listitem')).toHaveCount(2);
  });

  test('con una sola zona con locales, el selector ofrece «Cerca de mí» y esa zona', async ({
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
    await page.goto('/es/map');
    await expect(markers(page)).toHaveCount(6);
    await page.getByRole('button', { name: /Zona: Madrid/ }).click();
    const dialog = page.getByRole('dialog', { name: '¿Dónde?' });
    await expect(
      dialog.getByRole('button', { name: 'Cerca de mí' }),
    ).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Madrid/ })).toBeVisible();
  });

  test('si falla la carga de una zona, avisa, deja el mapa y permite reintentar', async ({
    page,
  }) => {
    await page.goto('/es/map');
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
    await page.goto('/es/map');
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
      await page.goto('/es/map?country=ES&city=barcelona');
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

  test('es la primera opción del selector, antes de las ciudades', async ({
    page,
  }) => {
    await page.goto('/es/map');
    await expect(markers(page)).toHaveCount(6);
    await page.getByRole('button', { name: /Zona:/ }).click();
    const dialog = page.getByRole('dialog', { name: '¿Dónde?' });
    const buttons = dialog.getByRole('button');
    // Primero «Cerrar», después «Cerca de mí» y luego las ciudades.
    await expect(buttons.nth(1)).toHaveAccessibleName('Cerca de mí');
    await expect(buttons.nth(2)).toHaveAccessibleName(/Madrid/);
    // Al escribir una ciudad, solo salen ciudades.
    await dialog.getByRole('searchbox').fill('barce');
    await expect(
      dialog.getByRole('button', { name: 'Cerca de mí' }),
    ).toHaveCount(0);
  });

  test('desde otra ciudad con locales, lleva a su zona (mirilla del mapa)', async ({
    context,
    page,
  }) => {
    await context.setGeolocation({ latitude: 41.3851, longitude: 2.1734 });
    await page.goto('/es/map');
    await expect(markers(page)).toHaveCount(6);
    await page.getByRole('button', { name: 'Cerca de mí' }).click();

    await expect(
      page.getByRole('button', { name: /Zona: Cerca de mí/ }),
    ).toBeVisible();
    await expect(markers(page)).toHaveCount(2);
    await expect(page).toHaveURL(/city=barcelona/);
    await expect(page.getByRole('img', { name: 'Tu ubicación' })).toBeVisible();
  });

  test('desde el selector, lo mismo; elegir una ciudad deja de lado la ubicación', async ({
    context,
    page,
  }) => {
    await context.setGeolocation({ latitude: 41.3851, longitude: 2.1734 });
    await page.goto('/es');
    await expect(page.getByRole('listitem')).toHaveCount(6);
    await chooseNearMe(page);
    await expect(
      page.getByRole('button', { name: /Zona: Cerca de mí/ }),
    ).toBeVisible();
    await expect(page.getByRole('listitem')).toHaveCount(2);
    await expect(page.getByText(/Ordenado por distancia/)).toBeVisible();

    await page.getByRole('button', { name: /Zona:/ }).click();
    const dialog = page.getByRole('dialog', { name: '¿Dónde?' });
    await expect(
      dialog.getByRole('button', { name: 'Cerca de mí' }),
    ).toHaveAttribute('aria-current', 'true');
    await dialog.getByRole('button', { name: /Madrid/ }).click();
    await expect(
      page.getByRole('button', { name: /Zona: Madrid/ }),
    ).toBeVisible();
    await expect(page.getByRole('listitem')).toHaveCount(6);
    await expect(page.getByText(/Ordenado por distancia/)).toHaveCount(0);
  });

  test('con la ubicación ya compartida, la mirilla vuelve a centrar el mapa en ella', async ({
    context,
    page,
  }) => {
    await context.setGeolocation({ latitude: 41.3851, longitude: 2.1734 });
    await page.goto('/es/map');
    const locate = page.getByRole('button', {
      name: 'Cerca de mí',
      exact: true,
    });
    await locate.click();
    await expect(locate).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('img', { name: 'Tu ubicación' })).toBeVisible();
    // Se mueve el mapa y la mirilla lo trae de vuelta.
    const you = page.getByRole('img', { name: 'Tu ubicación' });
    const box = (await page.getByRole('region').first().boundingBox())!;
    await page.mouse.move(box.x + 100, box.y + 300);
    await page.mouse.down();
    await page.mouse.move(box.x + 250, box.y + 300, { steps: 5 });
    await page.mouse.up();
    const moved = (await you.boundingBox())!;
    await locate.click();
    await expect
      .poll(async () => Math.abs((await you.boundingBox())!.x - moved.x))
      .toBeGreaterThan(20);
  });
});
