import { expect, test } from './support/test';

// El conmutador Mapa / Lista va arriba a la izquierda en el móvil y centrado en
// pantallas anchas; la mirilla de «Cerca de mí» vive en el propio mapa, debajo
// del zoom. Abajo solo queda la atribución del mapa, que es obligatoria y no
// puede taparse.
for (const width of [320, 390]) {
  test(`móvil ${width}px: el conmutador va arriba a la izquierda y la mirilla bajo el zoom`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 700 });
    await page.goto('/es/map');
    const attribution = page.locator('.maplibregl-ctrl-attrib');
    await expect(attribution).toBeVisible();
    const attr = (await attribution.boundingBox())!;

    const v = (await page
      .getByRole('navigation', { name: 'Vista' })
      .boundingBox())!;
    const locate = (await page
      .getByRole('button', { name: 'Cerca de mí' })
      .boundingBox())!;
    const zoomOut = (await page
      .getByRole('button', { name: /Alejar|Zoom out/ })
      .boundingBox())!;

    // Arriba a la izquierda, sin salirse.
    expect(v.x).toBeLessThanOrEqual(16);
    expect(v.y).toBeLessThan(attr.y / 2);
    // La mirilla, debajo del zoom, en el borde derecho y a la vista.
    expect(locate.y).toBeGreaterThanOrEqual(zoomOut.y + zoomOut.height - 1);
    expect(locate.x + locate.width).toBeLessThanOrEqual(width);
    expect(locate.width).toBeGreaterThanOrEqual(29);
    // El conmutador no se pisa con los controles y la atribución queda libre.
    expect(v.x + v.width).toBeLessThan(locate.x);
    expect(v.y + v.height).toBeLessThan(attr.y);
    expect(locate.y + locate.height).toBeLessThan(attr.y);
  });
}

test('tableta: el conmutador va centrado arriba del mapa', async ({ page }) => {
  // Desde 900 px se ven lista y mapa a la vez y no hay conmutador.
  await page.setViewportSize({ width: 800, height: 800 });
  await page.goto('/es/map');
  await expect(page.getByRole('navigation', { name: 'Vista' })).toBeVisible();
  const v = (await page
    .getByRole('navigation', { name: 'Vista' })
    .boundingBox())!;
  expect(Math.abs(v.x + v.width / 2 - 800 / 2)).toBeLessThan(2);
});

test('con la ficha de un local abierta, el conmutador sigue arriba y visible', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/es/map');
  const view = page.getByRole('navigation', { name: 'Vista' });
  await expect(view).toBeVisible();
  const before = (await view.boundingBox())!;
  await page.locator('[data-marker]').first().click();
  const card = page.getByRole('complementary');
  await expect(card).toBeVisible();
  await expect(view).toBeVisible();
  const v = (await view.boundingBox())!;
  const c = (await card.boundingBox())!;
  expect(v.y).toBe(before.y);
  expect(v.y + v.height).toBeLessThan(c.y);
});

for (const width of [320, 390]) {
  test(`lista ${width}px: el botón «Mapa» flota abajo, no tapa la última tarjeta y se queda al desplazar`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 700 });
    await page.goto('/es');
    await page.addStyleTag({
      content: '* { font-family: Verdana !important; }',
    });
    const button = page.getByRole('link', { name: 'Mapa' });
    // Los locales llegan de la API: hasta entonces no hay pantalla.
    await expect(button).toBeVisible();
    const b = (await button.boundingBox())!;
    expect(b.height).toBeGreaterThanOrEqual(44);
    expect(Math.abs(b.x + b.width / 2 - width / 2)).toBeLessThan(2);
    expect(b.y + b.height).toBeLessThanOrEqual(700);
    // En la lista ya no hay botón suelto de «Cerca de mí»: va en el selector.
    await expect(page.getByRole('button', { name: 'Cerca de mí' })).toHaveCount(
      0,
    );

    // Al bajar por la lista, el botón no se va y la última tarjeta queda
    // entera por encima.
    const last = page
      .getByRole('list', { name: 'Lista de locales' })
      .getByRole('listitem')
      .last();
    await last.evaluate((el) => {
      let p = el.parentElement;
      while (p && p.scrollHeight <= p.clientHeight) p = p.parentElement;
      p?.scrollTo(0, p.scrollHeight);
    });
    const after = (await button.boundingBox())!;
    expect(Math.abs(after.y - b.y)).toBeLessThan(2);
    const l = (await last.boundingBox())!;
    expect(l.y + l.height).toBeLessThanOrEqual(after.y);
  });
}
