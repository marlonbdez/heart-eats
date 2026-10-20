import { expect, test } from './support/test';

// El conmutador Mapa / Lista va arriba, en la misma fila que «Cerca de mí»:
// a la izquierda en el móvil y centrado en pantallas anchas. Abajo solo queda
// la atribución del mapa, que es obligatoria y no puede taparse.
for (const width of [320, 390]) {
  test(`móvil ${width}px: el conmutador va arriba a la izquierda, junto a «Cerca de mí»`, async ({
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
    const n = (await page
      .getByRole('button', { name: 'Cerca de mí' })
      .boundingBox())!;

    // Del mismo alto que «Cerca de mí».
    expect(Math.abs(v.height - n.height)).toBeLessThanOrEqual(1);
    // Arriba a la izquierda y en la misma fila que «Cerca de mí», sin pisarse.
    expect(v.x).toBeLessThanOrEqual(16);
    expect(v.y).toBeLessThan(attr.y / 2);
    expect(Math.abs(v.y + v.height / 2 - (n.y + n.height / 2))).toBeLessThan(8);
    expect(v.x + v.width).toBeLessThan(n.x);
    expect(n.x + n.width).toBeLessThanOrEqual(width);
    // La atribución queda libre abajo.
    expect(v.y + v.height).toBeLessThan(attr.y);
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
  const n = (await page
    .getByRole('button', { name: 'Cerca de mí' })
    .boundingBox())!;
  expect(Math.abs(v.x + v.width / 2 - 800 / 2)).toBeLessThan(2);
  expect(Math.abs(v.y + v.height / 2 - (n.y + n.height / 2))).toBeLessThan(8);
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
    const near = page.getByRole('button', { name: 'Cerca de mí' });
    // Los locales llegan de la API: hasta entonces no hay pantalla.
    await expect(button).toBeVisible();
    const b = (await button.boundingBox())!;
    expect(b.height).toBeGreaterThanOrEqual(44);
    expect(Math.abs(b.x + b.width / 2 - width / 2)).toBeLessThan(2);
    expect(b.y + b.height).toBeLessThanOrEqual(700);
    // «Cerca de mí» sigue arriba, a la derecha.
    const n = (await near.boundingBox())!;
    expect(n.x + n.width).toBeLessThanOrEqual(width);

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
