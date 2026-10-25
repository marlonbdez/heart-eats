import { choosePlace, expect, test, type Page } from './support/test';

test('soy de un negocio: solo cifras, en 4 pasos', async ({ page, sent }) => {
  await page.goto('/es/business');
  await expect(
    page.getByRole('heading', { name: 'Cuenta tu equipo' }),
  ).toBeVisible();

  // Sin elegir el local no se avanza.
  await page.getByRole('button', { name: 'Empezar' }).click();
  await expect(page.locator('p[role=alert]')).toContainText('Elige tu local');
  await choosePlace(
    page,
    '¿De qué local se trata?',
    'paso a paso',
    'Café Paso a Paso',
  );
  await page.getByRole('button', { name: 'Empezar' }).click();

  // Hay que elegir qué mostrar.
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('p[role=alert]')).toContainText('Elige una opción');
  await page.getByLabel(/Solo cifras/).check();
  await page.getByRole('button', { name: 'Continuar' }).click();

  // Las cifras tienen que tener sentido: con discapacidad, entre 1 y el total.
  await page.getByLabel('Personas en el equipo').fill('8');
  await page.getByLabel('De ellas, con discapacidad').fill('9');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('p[role=alert]')).toContainText(
    'no más que el total',
  );
  await page.getByLabel('De ellas, con discapacidad').fill('3');
  await page.getByRole('button', { name: 'Continuar' }).click();

  // La vista previa es la ficha real; sin correo y sin responsabilidad no se envía.
  await expect(page.getByText('3 de 8 personas')).toBeVisible();
  await page.getByRole('button', { name: 'Enviar a revisión' }).click();
  await expect(page.locator('p[role=alert]').first()).toContainText(
    'correo válido',
  );
  await page.getByLabel('Correo de contacto').fill('negocio@ejemplo.org');
  await page.getByRole('button', { name: 'Enviar a revisión' }).click();
  await expect(page.locator('p[role=alert]')).toContainText('Marca la casilla');
  await page.getByLabel(/Soy responsable del negocio/).check();
  await page.getByRole('button', { name: 'Enviar a revisión' }).click();
  await expect(page.getByRole('heading', { name: '¡Gracias!' })).toBeFocused();

  // Se envía a la API con el idioma y el correo, y sin lo que no hay.
  expect(sent).toEqual([
    {
      path: '/teams',
      body: {
        restaurantSlug: 'demo-cafe-paso-a-paso',
        level: 'minimal',
        summary: { totalStaff: 8, staffWithDisability: 3 },
        contactEmail: 'negocio@ejemplo.org',
        locale: 'es',
      },
    },
  ]);
});

test('soy de un negocio: una historia no se envía sin el permiso de la persona', async ({
  page,
  sent,
}) => {
  await page.goto('/es/business');
  await choosePlace(
    page,
    '¿De qué local se trata?',
    'masa madre',
    'La Masa Madre',
  );
  await page.getByRole('button', { name: 'Empezar' }).click();
  await page.getByLabel(/Historias con nombre/).check();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel('Personas en el equipo').fill('11');
  await page.getByLabel('De ellas, con discapacidad').fill('4');
  await page.getByRole('button', { name: 'Cocina' }).click();

  await page.getByLabel('Nombre o seudónimo').fill('Persona de ejemplo');
  await page.getByLabel('Puesto', { exact: true }).fill('Cocina');
  await page
    .getByLabel('Su historia, con sus palabras')
    .fill('Texto de ejemplo.');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('p[role=alert]')).toContainText('marca el permiso');

  await page.getByLabel(/Doy mi permiso/).check();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText('4 de 11 personas')).toBeVisible();
  await expect(page.getByText('Persona de ejemplo')).toBeVisible();
  await expect(page.getByText('Áreas: cocina')).toBeVisible();

  // La historia viaja con quién da el permiso.
  await page.getByLabel('Correo de contacto').fill('negocio@ejemplo.org');
  await page.getByLabel(/Soy responsable del negocio/).check();
  await page.getByRole('button', { name: 'Enviar a revisión' }).click();
  await expect(page.getByRole('heading', { name: '¡Gracias!' })).toBeFocused();
  expect(sent).toEqual([
    {
      path: '/teams',
      body: {
        restaurantSlug: 'demo-la-masa-madre',
        level: 'full',
        summary: { totalStaff: 11, staffWithDisability: 4 },
        areas: ['kitchen'],
        disabilityTypes: [],
        stories: [
          {
            displayName: 'Persona de ejemplo',
            role: 'Cocina',
            storyText: 'Texto de ejemplo.',
            consentBy: 'self',
          },
        ],
        contactEmail: 'negocio@ejemplo.org',
        locale: 'es',
      },
    },
  ]);
});

test('soy de un negocio: si se envía demasiado, lo dice con calma', async ({
  page,
}) => {
  await page.route('**/teams', (route) =>
    route.fulfill({
      status: 429,
      headers: { 'access-control-allow-origin': '*' },
      json: { error: { code: 'rate_limited', message: 'Muchas' } },
    }),
  );
  await page.goto('/es/business/demo-la-masa-madre');
  await page.getByRole('button', { name: 'Empezar' }).click();
  await page.getByLabel(/Solo cifras/).check();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel('Personas en el equipo').fill('8');
  await page.getByLabel('De ellas, con discapacidad').fill('3');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel('Correo de contacto').fill('negocio@ejemplo.org');
  await page.getByLabel(/Soy responsable del negocio/).check();
  await page.getByRole('button', { name: 'Enviar a revisión' }).click();
  await expect(page.locator('p[role=alert]')).toContainText(
    'vuelve a intentarlo dentro de un rato',
  );
});

test('soy de un negocio: en un equipo pequeño solo se muestra la cifra', async ({
  page,
}) => {
  await page.goto('/es/business');
  await choosePlace(
    page,
    '¿De qué local se trata?',
    'masa madre',
    'La Masa Madre',
  );
  await page.getByRole('button', { name: 'Empezar' }).click();
  await page.getByLabel(/Áreas y tipos/).check();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel('Personas en el equipo').fill('3');
  await page.getByLabel('De ellas, con discapacidad').fill('1');
  await expect(page.getByText('En equipos pequeños')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cocina' })).toHaveCount(0);
});

test('soy de un negocio: existe en inglés y ya no es «próximamente»', async ({
  page,
}) => {
  await page.goto('/en/business');
  await expect(
    page.getByRole('heading', { name: 'Tell us about your team' }),
  ).toBeVisible();
});

test('soy de un negocio: desde la ficha, el local ya viene elegido', async ({
  page,
}) => {
  await page.goto('/es/place/demo-la-masa-madre');
  await page.getByRole('link', { name: /¿Es tu local\?/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Cuenta tu equipo' }),
  ).toBeVisible();
  await expect(
    page.getByRole('group', { name: '¿De qué local se trata?' }),
  ).toContainText('La Masa Madre');
  // Sin tocar nada más, se puede seguir al paso 2.
  await page.getByRole('button', { name: 'Empezar' }).click();
  await expect(page.getByText('Paso 2 de 4')).toBeVisible();
});

test('soy de un negocio: de momento no pide fotos (no hay dónde subirlas)', async ({
  page,
}) => {
  await page.goto('/es/business/demo-la-masa-madre');
  await page.getByRole('button', { name: 'Empezar' }).click();
  await page.getByLabel(/Solo cifras/).check();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByLabel('Personas en el equipo')).toBeVisible();
  await expect(page.locator('input[type=file]')).toHaveCount(0);
});

// PNG de 1×1 píxel, para probar la subida sin depender de ningún archivo.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const png = { name: 'foto.png', mimeType: 'image/png', buffer: PIXEL };

// Hasta el paso 3 con «Historias con nombre» y una persona rellenada.
async function toStory(page: Page) {
  await page.goto('/es/business');
  await choosePlace(
    page,
    '¿De qué local se trata?',
    'masa madre',
    'La Masa Madre',
  );
  await page.getByRole('button', { name: 'Empezar' }).click();
  await page.getByLabel(/Historias con nombre/).check();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel('Personas en el equipo').fill('11');
  await page.getByLabel('De ellas, con discapacidad').fill('4');
  await page.getByLabel('Nombre o seudónimo').fill('Persona de ejemplo');
  await page.getByLabel('Puesto', { exact: true }).fill('Cocina');
  await page
    .getByLabel('Su historia, con sus palabras')
    .fill('Texto de ejemplo.');
}

test('soy de un negocio: la foto de una persona se sube y viaja con su historia', async ({
  page,
  sent,
}) => {
  await toStory(page);
  // Un archivo que no es imagen se rechaza con un aviso.
  await page.locator('#p0p').setInputFiles({
    name: 'nota.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('hola'),
  });
  await expect(page.locator('p[role=alert]')).toContainText('JPG, PNG o WebP');

  await page.locator('#p0p').setInputFiles(png);
  await expect(
    page.getByRole('img', { name: 'Foto de la persona 1' }),
  ).toBeVisible();
  // El permiso de la historia nombra la foto.
  await expect(page.getByLabel(/Doy mi permiso/)).toHaveAccessibleName(
    /mi foto, si he añadido una/,
  );
  await page.getByLabel(/Doy mi permiso/).check();
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByText('1 foto de una persona')).toBeVisible();
  await page.getByLabel('Correo de contacto').fill('negocio@ejemplo.org');
  await page.getByLabel(/Soy responsable del negocio/).check();
  await page.getByRole('button', { name: 'Enviar a revisión' }).click();
  await expect(page.getByRole('heading', { name: '¡Gracias!' })).toBeFocused();

  // La foto sube con su miniatura, que cuelga de ella, y el envío lleva la clave.
  const uploads = sent.filter((s) => s.path.startsWith('/uploads'));
  expect(uploads.map((u) => u.body.type)).toEqual(['image/webp', 'image/webp']);
  const team = sent.find((s) => s.path === '/teams')!;
  const stories = team.body.stories as { photoKey?: string }[];
  const key = stories[0]!.photoKey!;
  expect(key).toMatch(/^q\/[0-9a-f-]{36}\.webp$/);
  expect(uploads.at(-1)!.path).toBe(
    `/uploads?thumbOf=${key.replace(/^q\/|\.webp$/g, '')}`,
  );
});

test('soy de un negocio: sin foto no se sube nada; con foto se puede quitar', async ({
  page,
  sent,
}) => {
  await toStory(page);
  await page.locator('#p0p').setInputFiles(png);
  await page.getByRole('button', { name: 'Quitar foto' }).click();
  await expect(page.locator('#p0p')).toBeVisible();
  await page.getByLabel(/Doy mi permiso/).check();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText(/foto de una persona/)).toHaveCount(0);
  await page.getByLabel('Correo de contacto').fill('negocio@ejemplo.org');
  await page.getByLabel(/Soy responsable del negocio/).check();
  await page.getByRole('button', { name: 'Enviar a revisión' }).click();
  await expect(page.getByRole('heading', { name: '¡Gracias!' })).toBeFocused();
  expect(sent.some((s) => s.path.startsWith('/uploads'))).toBe(false);
  const stories = sent.find((s) => s.path === '/teams')!.body.stories;
  expect(stories).toEqual([
    {
      displayName: 'Persona de ejemplo',
      role: 'Cocina',
      storyText: 'Texto de ejemplo.',
      consentBy: 'self',
    },
  ]);
});

test('soy de un negocio: si falla la subida de la foto, avisa y no envía', async ({
  page,
  sent,
}) => {
  await page.route('http://localhost:3001/api/v1/uploads*', (route) =>
    route.fulfill({
      status: 503,
      headers: { 'access-control-allow-origin': '*' },
      json: { error: { code: 'uploads_unavailable', message: 'No' } },
    }),
  );
  await toStory(page);
  await page.locator('#p0p').setInputFiles(png);
  await page.getByLabel(/Doy mi permiso/).check();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel('Correo de contacto').fill('negocio@ejemplo.org');
  await page.getByLabel(/Soy responsable del negocio/).check();
  await page.getByRole('button', { name: 'Enviar a revisión' }).click();
  await expect(page.locator('p[role=alert]')).toBeVisible();
  expect(sent.some((s) => s.path === '/teams')).toBe(false);
});

test('soy de un negocio: en 320 px la foto de la persona cabe, también con letra ancha', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await toStory(page);
  await page.addStyleTag({ content: '* { font-family: Verdana !important; }' });
  await page.locator('#p0p').setInputFiles(png);
  await expect(
    page.getByRole('img', { name: 'Foto de la persona 1' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(0);
});

test('soy de un negocio: mientras se prepara la foto se avisa y no se puede elegir otra', async ({
  page,
}) => {
  // Reducir una foto grande tarda: se simula con una espera al codificarla.
  await page.addInitScript(() => {
    const toBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (...args) {
      setTimeout(() => toBlob.apply(this, args), 800);
    };
  });
  await toStory(page);
  await page.locator('#p0p').setInputFiles(png);
  await expect(page.getByRole('status')).toContainText('Preparando la foto');
  await expect(page.locator('#p0p')).toHaveCount(0);
  await expect(
    page.getByRole('img', { name: 'Foto de la persona 1' }),
  ).toBeVisible();
  await expect(page.getByText('Preparando la foto')).toHaveCount(0);
});
