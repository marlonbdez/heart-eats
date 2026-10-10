import { expect, test } from '@playwright/test';

// La atribución del mapa es obligatoria: nada puede taparla, tampoco en los
// móviles más pequeños.
for (const width of [320, 390]) {
  test(`móvil ${width}px: la atribución del mapa queda libre y el conmutador va centrado encima`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 700 });
    await page.goto('/es');
    const attribution = page.locator('.maplibregl-ctrl-attrib');
    await expect(attribution).toBeVisible();
    const attr = (await attribution.boundingBox())!;

    const view = page.getByRole('navigation', { name: 'Vista' });
    const near = page.getByRole('button', { name: 'Cerca de mí' });
    const v = (await view.boundingBox())!;
    const n = (await near.boundingBox())!;

    // El conmutador no llega a la atribución y está centrado.
    expect(v.y + v.height).toBeLessThan(attr.y);
    expect(Math.abs(v.x + v.width / 2 - width / 2)).toBeLessThan(2);
    // «Cerca de mí» queda arriba, dentro de la pantalla.
    expect(n.y).toBeLessThan(v.y);
    expect(n.x + n.width).toBeLessThanOrEqual(width);
  });
}

test('con la ficha de un local abierta, el conmutador se oculta', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/es');
  const view = page.getByRole('navigation', { name: 'Vista' });
  await expect(view).toBeVisible();
  await page.locator('[data-marker]').first().click();
  await expect(page.getByRole('complementary')).toBeVisible();
  await expect(view).toBeHidden();
  await page.getByRole('button', { name: 'Cerrar' }).click();
  await expect(view).toBeVisible();
});

test('en la lista el conmutador queda abajo, centrado y sin tapar nada', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto('/es/list');
  const view = page.getByRole('navigation', { name: 'Vista' });
  const v = (await view.boundingBox())!;
  // Pegado al borde inferior (no flotando como sobre el mapa) y centrado.
  expect(700 - (v.y + v.height)).toBeLessThanOrEqual(24);
  expect(Math.abs(v.x + v.width / 2 - 390 / 2)).toBeLessThan(2);
  // Al final de la lista el último local no queda tapado.
  const last = page.getByRole('link', { name: /Ver local/ }).last();
  await last.evaluate((el) => {
    let p = el.parentElement;
    while (p && p.scrollHeight <= p.clientHeight) p = p.parentElement;
    p?.scrollTo(0, p.scrollHeight);
  });
  const l = (await last.boundingBox())!;
  expect(l.y + l.height).toBeLessThanOrEqual(v.y);
});
