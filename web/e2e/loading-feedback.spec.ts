import { API, chooseNearMe, expect, test, type Page } from './support/test';

// Con poca cobertura la API tarda. Estas pruebas la retienen a propósito para
// comprobar que la web lo dice: indicador de carga, esqueleto, aviso de
// paciencia y botones que muestran que están trabajando.
test.use({ viewport: { width: 360, height: 780 } });

// Retiene las respuestas que casan con `pattern` hasta que se llama a la
// función devuelta; entonces siguen con la ruta de datos de la prueba.
async function hold(
  page: Page,
  pattern: string | RegExp | ((url: URL) => boolean),
  method?: string,
) {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route(pattern, async (route) => {
    if (method && route.request().method() !== method) return route.fallback();
    await gate;
    await route.fallback();
  });
  return release;
}

test('primera carga de la lista: esqueleto, «Cargando…» y aviso de paciencia', async ({
  page,
}) => {
  await page.clock.install();
  const release = await hold(page, `${API}/restaurants?**`);
  await page.goto('/es');

  await expect(page.getByRole('status').first()).toContainText('Cargando');
  await expect(
    page.getByRole('list', { name: 'Lista de locales' }),
  ).toHaveCount(0);
  // Aún no ha pasado el tiempo: sin aviso de lentitud.
  await expect(page.getByText(/La conexión va lenta/)).toHaveCount(0);

  await page.clock.fastForward(5000);
  await expect(page.getByText(/La conexión va lenta/)).toBeVisible();

  release();
  await expect(
    page
      .getByRole('list', { name: 'Lista de locales' })
      .getByRole('link')
      .first(),
  ).toBeVisible();
  await expect(page.getByText(/La conexión va lenta/)).toHaveCount(0);
  await expect(page.getByText('Cargando…')).toHaveCount(0);
});

test('el esqueleto no desborda en 320 px con una fuente ancha', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.clock.install();
  await hold(page, `${API}/restaurants?**`);
  await page.goto('/es');
  await page.addStyleTag({ content: '* { font-family: Verdana !important; }' });
  await page.clock.fastForward(5000);
  await expect(page.getByText(/La conexión va lenta/)).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('cambiar de zona con la pantalla ya dibujada: aviso de carga sin quitar la lista', async ({
  page,
}) => {
  await page.goto('/es');
  const list = page.getByRole('list', { name: 'Lista de locales' });
  await expect(list.getByRole('link').first()).toBeVisible();

  const release = await hold(page, `${API}/restaurants?**`);
  await page.getByRole('button', { name: /Zona:/ }).click();
  await page
    .getByRole('dialog', { name: '¿Dónde?' })
    .getByRole('button', { name: /Barcelona/ })
    .click();
  await expect(page.getByText('Cargando…')).toBeVisible();
  release();
  await expect(page.getByText('Cargando…')).toHaveCount(0);
});

test('enviar una respuesta: el botón muestra que trabaja y avisa si tarda', async ({
  page,
  sent,
}) => {
  await page.clock.install();
  await page.goto('/es/reply#token=good');
  await expect(page.getByLabel('Tu respuesta')).toBeVisible();
  // Solo el envío (POST) se retiene, no la lectura del enlace.
  const release = await hold(
    page,
    (url) => url.href === `${API}/replies/good`,
    'POST',
  );
  await page.getByLabel('Tu respuesta').fill('Sí, hay una rampa de 90 cm.');
  await page.getByRole('button', { name: 'Enviar respuesta' }).click();

  const busy = page.getByRole('button', { name: 'Enviando…' });
  await expect(busy).toBeDisabled();
  await expect(busy).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByText(/Seguimos enviando/)).toHaveCount(0);

  await page.clock.fastForward(5000);
  await expect(page.getByText(/Seguimos enviando/)).toBeVisible();

  release();
  await expect(
    page.getByRole('heading', { name: '¡Gracias por responder!' }),
  ).toBeVisible();
  expect(sent).toHaveLength(1);
});

test('«Cerca de mí»: mientras se busca la ubicación, el selector está ocupado', async ({
  page,
}) => {
  await page.addInitScript(() => {
    // Nunca contesta: se queda «buscando».
    navigator.geolocation.getCurrentPosition = () => {};
  });
  await page.goto('/es/list');
  await chooseNearMe(page);
  const zone = page.getByRole('button', { name: /Zona:/ });
  await expect(zone).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByText(/Buscando tu ubicación/)).toBeVisible();
});

test('«Cerca de mí»: la mirilla del mapa se ocupa mientras busca', async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = () => {};
  });
  await page.goto('/es/map');
  const locate = page.getByRole('button', { name: 'Cerca de mí' });
  await locate.click();
  await expect(locate).toHaveAttribute('aria-busy', 'true');
  await expect(locate).toBeDisabled();
});

test('al tocar un enlace con la red lenta aparece la barra y el aviso', async ({
  page,
}) => {
  await page.goto('/es');
  const link = page
    .getByRole('list', { name: 'Lista de locales' })
    .getByRole('link')
    .first();
  await expect(link).toBeVisible();

  await page.clock.install();
  // La ficha pide su página (o su carga RSC) por la red: se retiene.
  const release = await hold(page, /\/es\/place\/[^/]+(\.txt|\/?\?_rsc.*)$/);
  await link.click();
  await page.clock.fastForward(300);
  await expect(page.locator('[data-navigation-progress]')).toBeVisible();
  await page.clock.fastForward(5000);
  await expect(page.getByText(/La conexión va lenta/)).toBeVisible();

  release();
  await expect(page).toHaveURL(/\/es\/place\/demo-/);
  await expect(page.getByText(/La conexión va lenta/)).toHaveCount(0);
  await expect(page.locator('[data-navigation-progress]')).toHaveCount(0);
});

test('volver atrás no deja la barra de navegación colgada', async ({
  page,
}) => {
  await page.goto('/es');
  await page
    .getByRole('list', { name: 'Lista de locales' })
    .getByRole('link')
    .first()
    .click();
  await expect(page).toHaveURL(/\/es\/place\/demo-/);
  await page.goBack();
  await expect(page).toHaveURL(/\/es$/);
  await page.waitForTimeout(500);
  await expect(page.locator('[data-navigation-progress]')).toHaveCount(0);
});

test('pulsado: un botón cambia de aspecto mientras se mantiene pulsado', async ({
  page,
}) => {
  await page.goto('/es/list');
  const button = page.getByRole('button', { name: /Zona:/ });
  await expect(button).toBeVisible();
  const before = await button.evaluate((el) => getComputedStyle(el).boxShadow);
  const box = (await button.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  const during = await button.evaluate((el) => getComputedStyle(el).boxShadow);
  await page.mouse.up();
  expect(during).not.toBe(before);
});
