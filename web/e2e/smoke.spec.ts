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

test('el mapa se dibuja y muestra los locales', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await expect(page.locator('[data-marker]')).toHaveCount(6);

  // Una capa que depende del worker de MapLibre se dibuja de verdad.
  await expect
    .poll(async () => {
      const p = await pixelAt(page, 8, 70);
      return (
        Math.abs(p.r - BLUE.r) < 12 &&
        Math.abs(p.g - BLUE.g) < 12 &&
        Math.abs(p.b - BLUE.b) < 12
      );
    })
    .toBe(true);

  expect(errors.filter((e) => /worker/i.test(e))).toEqual([]);
  await expect(page.getByText('No se ha podido cargar el mapa')).toHaveCount(0);
});

test('al pulsar un marcador se abre la vista previa y Esc la cierra', async ({
  page,
}) => {
  await page.goto('/');
  const marker = page.getByRole('button', { name: /La Masa Madre/ });
  await marker.focus();
  await page.keyboard.press('Enter');

  const card = page.getByRole('complementary', {
    name: 'Vista previa del local',
  });
  await expect(card).toBeVisible();
  await expect(card).toContainText('Margarita de la casa');
  await expect(card).toContainText('Equipo inclusivo');

  await page.keyboard.press('Escape');
  await expect(card).toHaveCount(0);
  await expect(marker).toBeFocused();
});

test('el menú lateral abre, navega y se cierra', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  const menu = page.getByRole('dialog');
  await expect(menu).toBeVisible();

  await menu.getByRole('link', { name: 'Lista de locales' }).click();
  await expect(page).toHaveURL(/\/lista$/);
  await expect(menu).toBeHidden();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
