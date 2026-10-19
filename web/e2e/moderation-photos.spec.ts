import { expect, test, type Page } from './support/test';

// PNG de 1×1 píxel, para probar la subida sin depender de ningún archivo.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const png = { name: 'foto.png', mimeType: 'image/png', buffer: PIXEL };

test.beforeEach(({ session }) => {
  session.role = 'moderator';
});

async function openPlace(page: Page, search: string, name: RegExp) {
  await page.goto('/es/moderation');
  await page.getByRole('button', { name: 'Fotos', exact: true }).click();
  await page.getByLabel('Nombre del local').fill(search);
  await page.getByRole('button', { name: 'Buscar' }).click();
  await page.getByRole('button', { name }).click();
}

const photo = (page: Page, n: number) =>
  page.getByRole('listitem').filter({ hasText: new RegExp(`^.*Foto ${n}`) });

test('busca un local por su nombre y enseña sus fotos con su texto', async ({
  page,
}) => {
  await page.goto('/es/moderation');
  await page.getByRole('button', { name: 'Fotos', exact: true }).click();
  // El país por defecto es el del ámbito de quien modera.
  await expect(page.getByLabel('País')).toHaveValue('ES');

  await page.getByLabel('Nombre del local').fill('zzz');
  await page.getByRole('button', { name: 'Buscar' }).click();
  await expect(page.getByRole('status')).toContainText('ningún local');

  await page.getByLabel('Nombre del local').fill('masa');
  await page.getByRole('button', { name: 'Buscar' }).click();
  await page.getByRole('button', { name: /La Masa Madre/ }).click();

  await expect(
    page.getByRole('heading', { name: '[DEMO] La Masa Madre' }),
  ).toBeFocused();
  await expect(
    page.getByRole('heading', { name: 'Fotos de la galería (5 de 12)' }),
  ).toBeVisible();
  const first = photo(page, 1);
  await expect(first).toContainText('Portada');
  await expect(first.getByLabel('Texto alternativo (español)')).toHaveValue(
    'La barra con taburetes de madera',
  );
  await expect(first.getByLabel('Texto alternativo (inglés)')).toHaveValue(
    'The wooden bar',
  );
  // La portada no se puede volver a poner de portada.
  await expect(first.getByRole('button', { name: /de portada/ })).toHaveCount(
    0,
  );
  await expect(
    photo(page, 2).getByRole('button', { name: 'Poner la foto 2 de portada' }),
  ).toBeVisible();
});

test('guarda el texto alternativo y lo borra si se deja vacío', async ({
  page,
  sent,
}) => {
  await openPlace(page, 'masa', /La Masa Madre/);
  const second = photo(page, 2);
  await second
    .getByLabel('Texto alternativo (español)')
    .fill('  Una mesa junto a la ventana ');
  await second
    .getByRole('button', { name: 'Guardar el texto de la foto 2' })
    .click();
  await expect(page.getByRole('status').first()).toHaveText('Texto guardado.');
  const [call] = sent.filter((s) => s.path.endsWith('.webp'));
  expect(call!.path).toMatch(
    /^\/restaurants\/demo-la-masa-madre\/photos\/0b8e3a52-5a43-4b8a-9d5e-000000000102\.webp$/,
  );
  expect(call!.body).toEqual({ alt: { es: 'Una mesa junto a la ventana' } });

  // Vaciados los dos idiomas, se borra el texto.
  const first = photo(page, 1);
  await first.getByLabel('Texto alternativo (español)').fill('');
  await first.getByLabel('Texto alternativo (inglés)').fill('');
  await first
    .getByRole('button', { name: 'Guardar el texto de la foto 1' })
    .click();
  await expect(page.getByRole('status').first()).toHaveText('Texto guardado.');
  expect(sent.at(-1)!.body).toEqual({ alt: null });
});

test('poner otra foto de portada la sube al primer sitio y lleva el foco a la galería', async ({
  page,
  sent,
}) => {
  await openPlace(page, 'masa', /La Masa Madre/);
  await photo(page, 3)
    .getByRole('button', { name: 'Poner la foto 3 de portada' })
    .click();
  await expect(page.getByRole('status').first()).toHaveText(
    'Ahora es la portada.',
  );
  expect(sent.at(-1)!.body).toEqual({ cover: true });
  // Ahora la primera es la que tenía el texto de la mesa con pizzas.
  const first = photo(page, 1);
  await expect(first).toContainText('Portada');
  await expect(first.getByLabel('Texto alternativo (español)')).toHaveValue(
    'Una mesa con pizzas recién hechas',
  );
  await expect(
    page.getByRole('heading', { name: /Fotos de la galería/ }),
  ).toBeFocused();
});

test('retirar pide confirmación, se puede cancelar y borra la foto', async ({
  page,
  sent,
}) => {
  await openPlace(page, 'masa', /La Masa Madre/);
  const fourth = photo(page, 4);
  await fourth.getByRole('button', { name: 'Retirar la foto 4' }).click();
  await expect(fourth).toContainText('no se puede deshacer');
  await fourth.getByRole('button', { name: 'Cancelar' }).click();
  await expect(fourth).not.toContainText('no se puede deshacer');
  expect(sent.some((s) => s.path.includes('/photos/'))).toBe(false);

  await fourth.getByRole('button', { name: 'Retirar la foto 4' }).click();
  await fourth.getByRole('button', { name: 'Sí, retirar' }).click();
  await expect(
    page.getByRole('heading', { name: 'Fotos de la galería (4 de 12)' }),
  ).toBeVisible();
  await expect(page.getByRole('status').first()).toHaveText('Foto retirada.');
  expect(sent.at(-1)!.path).toBe(
    '/restaurants/demo-la-masa-madre/photos/0b8e3a52-5a43-4b8a-9d5e-000000000104.webp',
  );
  await expect(
    page.getByRole('heading', { name: /Fotos de la galería/ }),
  ).toBeFocused();
});

test('añadir una foto la reduce, la sube con su miniatura y la publica con su texto', async ({
  page,
  sent,
}) => {
  await openPlace(page, 'masa', /La Masa Madre/);

  // Sin foto elegida no se envía nada.
  await page.getByRole('button', { name: 'Añadir foto' }).click();
  await expect(page.locator('p[role=alert]')).toContainText('Elige una foto');

  await page.getByLabel('Foto', { exact: true }).setInputFiles({
    name: 'nota.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('hola'),
  });
  await expect(page.locator('p[role=alert]')).toContainText('JPG, PNG o WebP');

  await page.getByLabel('Foto', { exact: true }).setInputFiles(png);
  await expect(
    page.getByRole('img', { name: 'Vista previa de la foto elegida' }),
  ).toBeVisible();
  const add = page.getByRole('form').or(page.locator('form')).last();
  await add.getByLabel('Texto alternativo (español)').fill('La terraza');
  await add.getByLabel('Texto alternativo (inglés)').fill('The terrace');
  await page.getByLabel('Ponerla de portada').check();
  await page.getByRole('button', { name: 'Añadir foto' }).click();

  await expect(page.getByRole('status').first()).toHaveText('Foto añadida.');
  await expect(
    page.getByRole('heading', { name: 'Fotos de la galería (6 de 12)' }),
  ).toBeVisible();

  const uploads = sent.filter((s) => s.path.startsWith('/uploads'));
  expect(uploads).toHaveLength(2);
  const published = sent.find(
    (s) => s.path === '/restaurants/demo-la-masa-madre/photos',
  )!;
  expect(published.body).toMatchObject({
    photoKey: expect.stringMatching(/^q\/[0-9a-f-]{36}\.webp$/),
    alt: { es: 'La terraza', en: 'The terrace' },
    cover: true,
  });
  // Es la portada y el formulario queda vacío.
  await expect(
    photo(page, 1).getByLabel('Texto alternativo (español)'),
  ).toHaveValue('La terraza');
  await expect(page.getByLabel('Foto', { exact: true })).toHaveValue('');
});

test('una galería con una sola foto no ofrece cambiar la portada', async ({
  page,
}) => {
  await openPlace(page, 'paso', /Paso a Paso/);
  await expect(page.getByText('Foto 1')).toBeVisible();
  await expect(page.getByRole('button', { name: /de portada/ })).toHaveCount(0);
});

test('con la galería llena (12) solo deja retirar', async ({ page }) => {
  await openPlace(page, 'masa', /La Masa Madre/);
  for (let i = 0; i < 7; i++) {
    await page.getByLabel('Foto', { exact: true }).setInputFiles(png);
    await page.getByRole('button', { name: 'Añadir foto' }).click();
    await expect(
      page.getByRole('heading', {
        name: `Fotos de la galería (${6 + i} de 12)`,
      }),
    ).toBeVisible();
  }
  await expect(page.getByText('ya tiene 12 fotos')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Añadir foto' })).toHaveCount(
    0,
  );
});

test('si la ficha ya no está publicada lo dice y deja volver', async ({
  page,
}) => {
  await openPlace(page, 'masa', /La Masa Madre/);
  await page.route('http://localhost:3001/api/v1/restaurants/*', (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({
          status: 404,
          headers: { 'access-control-allow-origin': '*' },
          json: { error: { code: 'not_found', message: 'No' } },
        })
      : route.fallback(),
  );
  await page.getByRole('button', { name: 'Buscar otro local' }).click();
  await page.getByLabel('Nombre del local').fill('masa');
  await page.getByRole('button', { name: 'Buscar' }).click();
  await page.getByRole('button', { name: /La Masa Madre/ }).click();
  await expect(page.locator('p[role=alert]')).toContainText('ya no está');
});

test('en inglés y en 320 px con letra ancha todo cabe', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/en/moderation');
  await page.getByRole('button', { name: 'Photos', exact: true }).click();
  await page.getByLabel('Name of the place').fill('masa');
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('button', { name: /La Masa Madre/ }).click();
  await expect(page.getByText('Photo 1', { exact: true })).toBeVisible();
  await page.addStyleTag({ content: '* { font-family: Verdana !important; }' });
  await page.getByRole('button', { name: 'Remove photo 2' }).click();
  await expect(
    page.getByText('Remove photo 2? It is deleted completely'),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(0);
});
