import { expect, test, type Page } from './support/test';
import { fillPlace } from './support/propose';

test('proponer un local: valida el nombre y recorre los 4 pasos', async ({
  page,
}) => {
  await page.goto('/es/propose');

  // Sin nombre no se avanza.
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('p[role=alert]').first()).toContainText(
    'nombre del local',
  );

  await fillPlace(page, 'Local de prueba');
  await page.getByRole('button', { name: /Pizza/ }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByText('Plato 1')).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();

  await page.getByLabel(/Un enlace que lo confirme/).fill('basura');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('p[role=alert]')).toContainText('https://');
  await page
    .getByLabel(/Un enlace que lo confirme/)
    .fill('https://ejemplo.org');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByText('Local de prueba')).toBeVisible();
  await page.getByRole('button', { name: 'Enviar propuesta' }).click();
  await expect(
    page.getByRole('heading', { name: '¡Gracias por proponerlo!' }),
  ).toBeFocused();
});

test('proponer un local: existe en inglés', async ({ page }) => {
  await page.goto('/en/propose');
  await expect(
    page.getByRole('heading', { name: 'Suggest a place' }),
  ).toBeVisible();
});

// PNG de 1×1 píxel, para probar la subida sin depender de ningún archivo.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function toStepTwo(page: Page, name: string) {
  await page.goto('/es/propose');
  await fillPlace(page, name);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel('Nombre del plato').fill('Tarta de la casa');
}

test('las fotos se piden en una zona que también admite arrastrar y soltar', async ({
  page,
}) => {
  await toStepTwo(page, 'Local con zona de fotos');

  const zone = page.locator('#d0p').locator('..');
  await expect(zone).toContainText('Elige una foto');
  await expect(zone).toContainText(
    'JPG, PNG o WebP · se reduce en tu dispositivo',
  );

  // Soltar una imagen encima funciona igual que elegirla.
  const data = await page.evaluateHandle((base64) => {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], 'foto.png', { type: 'image/png' }));
    return dt;
  }, PIXEL.toString('base64'));
  await zone.dispatchEvent('dragover', { dataTransfer: data });
  await zone.dispatchEvent('drop', { dataTransfer: data });
  await expect(
    page.getByRole('img', { name: 'Foto del plato 1' }),
  ).toBeVisible();

  // Sin desbordes horizontales a 360 px.
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('proponer un local: fotos del plato y del local, con permiso, subidas al enviar', async ({
  page,
  sent,
}) => {
  await toStepTwo(page, 'Local con fotos');

  // Un archivo que no es imagen se rechaza con un aviso.
  await page.locator('#d0p').setInputFiles({
    name: 'nota.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('hola'),
  });
  await expect(page.locator('p[role=alert]')).toContainText('JPG, PNG o WebP');

  // Una imagen se reduce y se ve la vista previa, con su nombre accesible.
  const png = { name: 'foto.png', mimeType: 'image/png', buffer: PIXEL };
  await page.locator('#d0p').setInputFiles(png);
  await expect(
    page.getByRole('img', { name: 'Foto del plato 1' }),
  ).toBeVisible();
  await page.locator('#v-photo-new').setInputFiles(png);
  await expect(
    page.getByRole('img', { name: 'Foto 1 del local' }),
  ).toBeVisible();

  // Sin el permiso no se continúa.
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('p[role=alert]')).toContainText('Marca la casilla');
  await page.getByLabel(/Estas fotos son mías/).check();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByText('2 fotos')).toBeVisible();
  await page.getByRole('button', { name: 'Enviar propuesta' }).click();
  await expect(
    page.getByRole('heading', { name: '¡Gracias por proponerlo!' }),
  ).toBeFocused();

  // Cada foto sube con su miniatura (que cuelga de la foto) y el envío lleva
  // las claves.
  const uploads = sent.filter((s) => s.path.startsWith('/uploads'));
  const photos = uploads.filter((s) => s.path === '/uploads');
  const thumbs = uploads.filter((s) => s.path.startsWith('/uploads?thumbOf='));
  expect(photos).toHaveLength(2);
  expect(thumbs).toHaveLength(2);
  for (const u of uploads) {
    expect(u.body.type).toBe('image/webp');
    expect(u.body.size).toBeGreaterThan(0);
  }
  const proposal = sent.find((s) => s.path === '/proposals')!;
  const dishKey = (proposal.body.dishes as { photoKey: string }[])[0]!.photoKey;
  const placeKeys = proposal.body.photoKeys as string[];
  expect(dishKey).toMatch(/^q\/[0-9a-f-]{36}\.webp$/);
  expect(placeKeys).toHaveLength(1);
  const idOf = (key: string) => key.replace(/^q\/|\.webp$/g, '');
  expect(thumbs.map((s) => s.path).sort()).toEqual(
    [dishKey, placeKeys[0]!].map((k) => `/uploads?thumbOf=${idOf(k)}`).sort(),
  );
});

test('proponer un local: la foto se reduce a 1600 px y la miniatura a 400 px', async ({
  page,
  sent,
}) => {
  await toStepTwo(page, 'Local con foto grande');
  // Una foto grande, creada en el propio navegador.
  await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 3200;
    canvas.height = 2400;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(0, 0, 3200, 2400);
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(400, 300, 1600, 1200);
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), 'image/png'),
    );
    const data = new DataTransfer();
    data.items.add(new File([blob], 'grande.png', { type: 'image/png' }));
    const input = document.querySelector<HTMLInputElement>('#d0p')!;
    input.files = data.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // La vista previa es la miniatura: 400 px de ancho, con la misma proporción.
  const preview = page.getByRole('img', { name: 'Foto del plato 1' });
  await expect(preview).toBeVisible();
  expect(
    await preview.evaluate((img: HTMLImageElement) => [
      img.naturalWidth,
      img.naturalHeight,
    ]),
  ).toEqual([400, 300]);

  await page.getByLabel(/Estas fotos son mías/).check();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Enviar propuesta' }).click();
  await expect(
    page.getByRole('heading', { name: '¡Gracias por proponerlo!' }),
  ).toBeFocused();

  const [photo] = sent.filter((s) => s.path === '/uploads');
  const [thumb] = sent.filter((s) => s.path.startsWith('/uploads?thumbOf='));
  expect([photo?.body.width, photo?.body.height]).toEqual([1600, 1200]);
  expect([thumb?.body.width, thumb?.body.height]).toEqual([400, 300]);
  // Pesan poco: muy por debajo del tope del servidor (1 MB y 100 KB).
  expect(photo!.body.size as number).toBeLessThan(1024 * 1024);
  expect(thumb!.body.size as number).toBeLessThan(100 * 1024);
});

test('proponer un local: se puede quitar la foto y seguir sin ella', async ({
  page,
  sent,
}) => {
  await toStepTwo(page, 'Otro local');
  await page.locator('#d0p').setInputFiles({
    name: 'plato.png',
    mimeType: 'image/png',
    buffer: PIXEL,
  });
  await page.getByRole('button', { name: 'Quitar foto' }).click();
  await expect(page.locator('#d0p')).toBeVisible();
  // Sin fotos, ya no se pide el permiso.
  await expect(page.getByLabel(/Estas fotos son mías/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Enviar propuesta' }).click();
  await expect(
    page.getByRole('heading', { name: '¡Gracias por proponerlo!' }),
  ).toBeFocused();
  // Sin fotos no se sube nada.
  expect(sent.some((s) => s.path.startsWith('/uploads'))).toBe(false);
});

test('proponer un local: del local se admiten hasta 5 fotos', async ({
  page,
}) => {
  await toStepTwo(page, 'Local con muchas fotos');
  const png = { name: 'foto.png', mimeType: 'image/png', buffer: PIXEL };
  for (let i = 1; i <= 5; i++) {
    await page.locator('#v-photo-new').setInputFiles(png);
    await expect(
      page.getByRole('img', { name: `Foto ${i} del local` }),
    ).toBeVisible();
  }
  await expect(page.locator('#v-photo-new')).toHaveCount(0);
});

test('proponer un local: si falla la subida de una foto, avisa y no envía', async ({
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
  await toStepTwo(page, 'Local sin subida');
  await page.locator('#d0p').setInputFiles({
    name: 'plato.png',
    mimeType: 'image/png',
    buffer: PIXEL,
  });
  await page.getByLabel(/Estas fotos son mías/).check();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Enviar propuesta' }).click();
  await expect(page.locator('p[role=alert]')).toContainText(
    'No hemos podido enviar la propuesta',
  );
  expect(sent.some((s) => s.path === '/proposals')).toBe(false);
});

test('en 320 px el paso de fotos cabe, también con letra ancha', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await toStepTwo(page, 'Local con fotos');
  await page.addStyleTag({ content: '* { font-family: Verdana !important; }' });
  const png = { name: 'foto.png', mimeType: 'image/png', buffer: PIXEL };
  await page.locator('#d0p').setInputFiles(png);
  await page.locator('#v-photo-new').setInputFiles(png);
  await expect(
    page.getByRole('img', { name: 'Foto 1 del local' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(0);
});
