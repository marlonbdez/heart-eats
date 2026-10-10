import { expect, test } from '@playwright/test';

// El conmutador Mapa / Lista va arriba, en la misma fila que «Cerca de mí»:
// a la izquierda en el móvil y centrado en pantallas anchas. Abajo solo queda
// la atribución del mapa, que es obligatoria y no puede taparse.
for (const width of [320, 390]) {
  test(`móvil ${width}px: el conmutador va arriba a la izquierda, junto a «Cerca de mí»`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 700 });
    await page.goto('/es');
    const attribution = page.locator('.maplibregl-ctrl-attrib');
    await expect(attribution).toBeVisible();
    const attr = (await attribution.boundingBox())!;

    const v = (await page
      .getByRole('navigation', { name: 'Vista' })
      .boundingBox())!;
    const n = (await page
      .getByRole('button', { name: 'Cerca de mí' })
      .boundingBox())!;

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

test('escritorio: el conmutador va centrado arriba del mapa', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/es');
  const v = (await page
    .getByRole('navigation', { name: 'Vista' })
    .boundingBox())!;
  const n = (await page
    .getByRole('button', { name: 'Cerca de mí' })
    .boundingBox())!;
  expect(Math.abs(v.x + v.width / 2 - 1280 / 2)).toBeLessThan(2);
  expect(Math.abs(v.y + v.height / 2 - (n.y + n.height / 2))).toBeLessThan(8);
});

test('con la ficha de un local abierta, el conmutador sigue arriba y visible', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/es');
  const view = page.getByRole('navigation', { name: 'Vista' });
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
  test(`lista ${width}px: el conmutador está arriba junto a «Cerca de mí» y se queda al desplazar`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 700 });
    await page.goto('/es/list');
    const view = page.getByRole('navigation', { name: 'Vista' });
    const near = page.getByRole('button', { name: 'Cerca de mí' });
    const v = (await view.boundingBox())!;
    const n = (await near.boundingBox())!;
    expect(v.x).toBeLessThanOrEqual(16);
    expect(Math.abs(v.y + v.height / 2 - (n.y + n.height / 2))).toBeLessThan(8);
    expect(v.x + v.width).toBeLessThan(n.x);
    expect(n.x + n.width).toBeLessThanOrEqual(width);

    // Al bajar por la lista, el conmutador no se va.
    const last = page.getByRole('link', { name: /Ver local/ }).last();
    await last.evaluate((el) => {
      let p = el.parentElement;
      while (p && p.scrollHeight <= p.clientHeight) p = p.parentElement;
      p?.scrollTo(0, p.scrollHeight);
    });
    const after = (await view.boundingBox())!;
    expect(Math.abs(after.y - v.y)).toBeLessThan(2);
    await expect(last).toBeInViewport();
  });
}
