import { expect, test } from './support/test';
import { restaurants } from './fixtures/restaurants';

const PLACE = '/es/place/demo-la-masa-madre';
const NAME = '[DEMO] La Masa Madre';

const viewer = (page: import('@playwright/test').Page, name = NAME) =>
  page.getByRole('dialog', { name: `Fotos de ${name}` });
const openButton = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: `Abrir las fotos de ${NAME}` }).first();

test('la ficha enseña la portada y un botón para ver todas las fotos', async ({
  page,
}) => {
  await page.goto(PLACE);
  await expect(openButton(page)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Ver las 5 fotos' }),
  ).toBeVisible();
  // La portada carga de verdad.
  await expect
    .poll(() =>
      openButton(page)
        .locator('img')
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(viewer(page)).toBeHidden();
});

test('el visor se abre en la dirección, con contador y textos alternativos', async ({
  page,
}) => {
  await page.goto(PLACE);
  await page.getByRole('button', { name: 'Ver las 5 fotos' }).click();

  await expect(viewer(page)).toBeVisible();
  expect(page.url()).toMatch(/#photos$/);
  await expect(viewer(page).getByText('1 / 5')).toBeVisible();
  // Con texto alternativo escrito se usa; si no, uno genérico.
  await expect(
    viewer(page).getByRole('img', { name: 'La barra con taburetes de madera' }),
  ).toBeVisible();
  await expect(
    viewer(page).getByRole('img', { name: `Foto 2 de ${NAME}` }),
  ).toBeAttached();
});

test('con el teclado se pasa de foto, al principio y al final', async ({
  page,
}) => {
  await page.goto(PLACE);
  await page.getByRole('button', { name: 'Ver las 5 fotos' }).click();
  const track = viewer(page).getByRole('group', { name: `Fotos de ${NAME}` });
  await expect(track).toBeFocused();

  await page.keyboard.press('ArrowRight');
  await expect(viewer(page).getByText('2 / 5')).toBeVisible();
  await page.keyboard.press('End');
  await expect(viewer(page).getByText('5 / 5')).toBeVisible();
  await page.keyboard.press('Home');
  await expect(viewer(page).getByText('1 / 5')).toBeVisible();
});

test('al deslizar, el contador sigue la foto', async ({ page }) => {
  await page.goto(PLACE);
  await page.getByRole('button', { name: 'Ver las 5 fotos' }).click();
  await viewer(page)
    .getByRole('group', { name: `Fotos de ${NAME}` })
    .evaluate((el) => {
      el.scrollTo({ left: el.clientWidth * 2, behavior: 'instant' });
    });
  await expect(viewer(page).getByText('3 / 5')).toBeVisible();
});

test('Atrás cierra el visor y se queda en la ficha', async ({ page }) => {
  await page.goto(PLACE);
  await page.getByRole('button', { name: 'Ver las 5 fotos' }).click();
  await expect(viewer(page)).toBeVisible();

  await page.goBack();
  await expect(viewer(page)).toBeHidden();
  await expect(page).toHaveURL(/place\/demo-la-masa-madre$/);
  await expect(page.getByRole('heading', { name: NAME })).toBeVisible();
});

test('Escape y el botón de cerrar lo cierran, y el foco vuelve a la portada', async ({
  page,
}) => {
  await page.goto(PLACE);
  await openButton(page).click();
  await page.keyboard.press('Escape');
  await expect(viewer(page)).toBeHidden();
  await expect(page).not.toHaveURL(/#photos/);
  await expect(openButton(page)).toBeFocused();

  await openButton(page).click();
  await viewer(page).getByRole('button', { name: 'Cerrar las fotos' }).click();
  await expect(viewer(page)).toBeHidden();
  await expect(page).not.toHaveURL(/#photos/);
});

test('una dirección con #photos abre el visor, y cerrarlo no saca de la ficha', async ({
  page,
}) => {
  await page.goto(`${PLACE}#photos`);
  await expect(viewer(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(viewer(page)).toBeHidden();
  await expect(page.getByRole('heading', { name: NAME })).toBeVisible();
  await expect(page).toHaveURL(/place\/demo-la-masa-madre$/);
});

test('en pantalla ancha hay mosaico y cada foto abre el visor en su sitio', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(PLACE);
  const tiles = page.getByRole('button', {
    name: `Abrir las fotos de ${NAME}`,
  });
  await expect(tiles.nth(1)).toBeVisible();
  await tiles.nth(1).click();
  await expect(viewer(page).getByText('2 / 5')).toBeVisible();
  // Con ratón hay flechas.
  await viewer(page).getByRole('button', { name: 'Foto siguiente' }).click();
  await expect(viewer(page).getByText('3 / 5')).toBeVisible();
});

test('en el móvil solo se ve la portada, sin mosaico', async ({ page }) => {
  await page.goto(PLACE);
  await expect(
    page.getByRole('button', { name: `Abrir las fotos de ${NAME}` }).nth(1),
  ).toBeHidden();
});

test('con una sola foto no hay botón de todas ni flechas', async ({ page }) => {
  await page.goto('/es/place/demo-cafe-paso-a-paso');
  const name = '[DEMO] Café Paso a Paso';
  await expect(page.getByRole('button', { name: /Ver las/ })).toHaveCount(0);
  await page
    .getByRole('button', { name: `Abrir las fotos de ${name}` })
    .click();
  const dialog = page.getByRole('dialog', { name: `Fotos de ${name}` });
  await expect(dialog.getByText('1 / 1')).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Foto siguiente' }),
  ).toHaveCount(0);
});

test('sin fotos, la ficha sigue con su cabecera de siempre', async ({
  page,
}) => {
  await page.goto('/es/place/demo-taberna-la-vereda');
  await expect(page.getByRole('img', { name: 'Sin foto' })).toBeVisible();
  await expect(page.getByRole('button', { name: /fotos/ })).toHaveCount(0);
});

test('la tarjeta usa la miniatura de la portada', async ({ page }) => {
  await page.goto('/es/list');
  await expect(
    page.locator('img[src$="000000000101-thumb.webp"]').first(),
  ).toBeVisible();
});

test('en inglés, el visor tiene sus textos', async ({ page }) => {
  await page.goto('/en/place/demo-la-masa-madre');
  await page.getByRole('button', { name: 'See all 5 photos' }).click();
  const dialog = page.getByRole('dialog', { name: `Photos of ${NAME}` });
  await expect(dialog.getByText('1 / 5')).toBeVisible();
  await expect(
    dialog.getByRole('img', { name: 'The wooden bar' }),
  ).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Close the photos' }),
  ).toBeVisible();
});

test('en 320 px la ficha con fotos y el visor caben, también con letra ancha', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(PLACE);
  await page.addStyleTag({ content: '* { font-family: Verdana !important; }' });
  const overflow = () =>
    page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
  expect(await overflow()).toBeLessThanOrEqual(0);
  await page.getByRole('button', { name: 'Ver las 5 fotos' }).click();
  await expect(viewer(page).getByText('1 / 5')).toBeVisible();
  const box = await viewer(page).boundingBox();
  expect(box?.width).toBeLessThanOrEqual(320);
  await expect(
    viewer(page).getByRole('button', { name: 'Cerrar las fotos' }),
  ).toBeInViewport();
});

test('en el móvil las flechas están a media altura, a la vista, y se pueden tocar', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto('/es/place/demo-la-masa-madre');
  await page.getByRole('button', { name: 'Ver las 5 fotos' }).click();
  const next = viewer(page).getByRole('button', { name: 'Foto siguiente' });
  const previous = viewer(page).getByRole('button', {
    name: 'Foto anterior',
  });
  await expect(next).toBeInViewport({ ratio: 1 });
  // A media altura: lejos del borde de abajo, que la barra del navegador tapa.
  const box = (await next.boundingBox())!;
  expect(box.y + box.height / 2).toBeGreaterThan(250);
  expect(box.y + box.height / 2).toBeLessThan(450);

  await next.tap();
  await expect(viewer(page).getByText('2 / 5')).toBeVisible();
  await previous.tap();
  await expect(viewer(page).getByText('1 / 5')).toBeVisible();
});

test('con dos fotos se pasa de una a otra con las flechas, también con fotos grandes', async ({
  page,
}) => {
  const big = (color: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="1067" height="1600"><rect width="1067" height="1600" fill="${color}"/></svg>`;
  await page.route('**/api/v1/photos/*', (route) =>
    route.fulfill({
      headers: { 'access-control-allow-origin': '*' },
      contentType: 'image/svg+xml',
      body: big('#2980b9'),
    }),
  );
  await page.route('**/api/v1/restaurants/demo-cafe-paso-a-paso', (route) =>
    route.fulfill({
      headers: { 'access-control-allow-origin': '*' },
      json: {
        ...restaurants.find((r) => r.slug === 'demo-cafe-paso-a-paso'),
        photos: [1, 2].map((n) => ({
          url: `http://localhost:3001/api/v1/photos/0b8e3a52-5a43-4b8a-9d5e-00000000020${n}.webp`,
          thumbUrl: `http://localhost:3001/api/v1/photos/0b8e3a52-5a43-4b8a-9d5e-00000000020${n}-thumb.webp`,
        })),
      },
    }),
  );
  await page.goto('/es/place/demo-cafe-paso-a-paso');
  await page.getByRole('button', { name: 'Ver las 2 fotos' }).click();
  const dialog = viewer(page, '[DEMO] Café Paso a Paso');
  await expect(dialog.getByText('1 / 2')).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Foto anterior' }),
  ).toBeDisabled();
  await dialog.getByRole('button', { name: 'Foto siguiente' }).tap();
  await expect(dialog.getByText('2 / 2')).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Foto siguiente' }),
  ).toBeDisabled();
  await dialog.getByRole('button', { name: 'Foto anterior' }).tap();
  await expect(dialog.getByText('1 / 2')).toBeVisible();
});
