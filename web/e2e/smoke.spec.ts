import { expect, test, type Page } from '@playwright/test';

// El estilo real vive en OpenFreeMap. En la prueba lo sustituimos por uno
// propio para no depender de un servicio externo. Incluye una capa GeoJSON,
// que MapLibre procesa en su worker: si el worker no arranca, no se dibuja.
const BLUE = { r: 42, g: 127, b: 220 };
const testStyle = {
  version: 8,
  sources: {
    world: {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-4.5, 39.8],
              [-2.9, 39.8],
              [-2.9, 41.0],
              [-4.5, 41.0],
              [-4.5, 39.8],
            ],
          ],
        },
      },
    },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#ffffff' } },
    {
      id: 'fill',
      type: 'fill',
      source: 'world',
      paint: { 'fill-color': '#2a7fdc', 'fill-opacity': 1 },
    },
  ],
};

async function mockMapStyle(page: Page) {
  await page.route('https://tiles.openfreemap.org/**', (route) =>
    route.fulfill({ contentType: 'application/json', json: testStyle }),
  );
}

// Lee un píxel de una captura de pantalla sin dependencias extra.
async function pixelAt(page: Page, x: number, y: number) {
  const png = await page.screenshot({ clip: { x, y, width: 1, height: 1 } });
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return { r, g, b };
  }, png.toString('base64'));
}

test.beforeEach(async ({ page }) => {
  await mockMapStyle(page);
});

// Pruebas de humo: solo comprueban lo que, si falla, deja la web inservible
// (mapa, navegación, idiomas, búsqueda). Evitan depender de textos concretos o
// del número de locales de ejemplo, que cambiarán mientras se afina el diseño.

test('el mapa se dibuja y muestra los locales', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/es');
  await expect(page.locator('[data-marker]').first()).toBeVisible();

  // Una capa que depende del worker de MapLibre se dibuja de verdad.
  await expect
    .poll(async () => {
      const box = (await page.getByRole('region').first().boundingBox())!;
      const p = await pixelAt(page, box.x + 8, box.y + 8);
      return (
        Math.abs(p.r - BLUE.r) < 12 &&
        Math.abs(p.g - BLUE.g) < 12 &&
        Math.abs(p.b - BLUE.b) < 12
      );
    })
    .toBe(true);

  expect(errors.filter((e) => /worker/i.test(e))).toEqual([]);
});

test('un marcador abre su vista previa y Esc la cierra', async ({ page }) => {
  await page.goto('/es');
  const marker = page.locator('[data-marker]').first();
  await marker.focus();
  await page.keyboard.press('Enter');

  const card = page.getByRole('complementary');
  await expect(card).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(card).toHaveCount(0);
  await expect(marker).toBeFocused();
});

test('el menú lateral abre, navega y se cierra', async ({ page }) => {
  await page.goto('/es');
  await page.locator('button[aria-haspopup="dialog"]').click();
  const menu = page.getByRole('dialog');
  await expect(menu).toBeVisible();

  await menu.locator('a[href="/es/lista"]').click();
  await expect(page).toHaveURL(/\/es\/lista$/);
  await expect(menu).toBeHidden();
});

test('los idiomas funcionan: la raíz va a /es y /en carga en inglés', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/es\/?$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');

  await page.goto('/en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('[data-marker]').first()).toBeVisible();
});

test('el buscador y las categorías filtran los marcadores', async ({
  page,
}) => {
  await page.goto('/es');
  const markers = page.locator('[data-marker]');
  await expect(markers.first()).toBeVisible();
  const total = await markers.count();

  await page.getByRole('searchbox').fill('lavapies');
  await expect(markers).toHaveCount(1);

  await page.getByRole('searchbox').fill('');
  await expect(markers).toHaveCount(total);

  await page.locator('button[aria-pressed]').first().click();
  await expect.poll(() => markers.count()).toBeLessThan(total);
});

test('la lista muestra los mismos locales y conserva la búsqueda', async ({
  page,
}) => {
  await page.goto('/es');
  const markers = page.locator('[data-marker]');
  await expect(markers.first()).toBeVisible();
  const total = await markers.count();

  await page
    .getByRole('navigation')
    .last()
    .locator('a[href^="/es/lista"]')
    .click();
  await expect(page).toHaveURL(/\/es\/lista$/);
  const items = page.getByRole('list').last().getByRole('listitem');
  await expect(items).toHaveCount(total);

  await page.getByRole('searchbox').fill('lavapies');
  await expect(items).toHaveCount(1);

  // Volver al mapa lleva la búsqueda consigo.
  await page
    .getByRole('navigation')
    .last()
    .locator('a[href="/es?q=lavapies"]')
    .click();
  await expect(page.getByRole('searchbox')).toHaveValue('lavapies');
  await expect(markers).toHaveCount(1);
});

test('la lista lleva a la ficha, con El Equipo y el botón de volver', async ({
  page,
}) => {
  await page.goto('/es/lista');
  await page.getByRole('link', { name: 'Ver local →' }).first().click();
  await expect(page).toHaveURL(/\/es\/local\/demo-/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('[DEMO]');
  await expect(
    page.getByRole('heading', { name: /equipo detrás/i }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Horario' })).toBeVisible();
  await page.getByRole('link', { name: /Volver/ }).click();
  await expect(page).toHaveURL(/\/es\/?$/);
});

test.describe('Cerca de mí', () => {
  test.use({ permissions: ['geolocation'] });

  test('ordena la lista por distancia y muestra la distancia', async ({
    context,
    page,
  }) => {
    await context.setGeolocation({ latitude: 40.4085, longitude: -3.7012 });
    await page.goto('/es/lista');
    await page.getByRole('button', { name: 'Cerca de mí' }).click();
    await expect(page.getByText(/Ordenado por distancia/)).toBeVisible();
    const first = page.getByRole('listitem').first();
    await expect(first).toContainText('La Masa Madre');
    await expect(first).toContainText(/\d+\s?m\b/);
  });

  test('fuera de la zona avisa y no ordena', async ({ context, page }) => {
    await context.setGeolocation({ latitude: 41.3851, longitude: 2.1734 });
    await page.goto('/es/lista');
    await page.getByRole('button', { name: 'Cerca de mí' }).click();
    await expect(page.getByText(/Aún no hay locales cerca/)).toBeVisible();
  });
});

test('sin permiso de ubicación, avisa y la web sigue usable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (_ok, fail) =>
      fail?.({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError);
  });
  await page.goto('/es');
  await page.getByRole('button', { name: 'Cerca de mí' }).click();
  await expect(page.getByText(/No tenemos permiso/)).toBeVisible();
  await expect(page.locator('[data-marker]').first()).toBeVisible();
});
