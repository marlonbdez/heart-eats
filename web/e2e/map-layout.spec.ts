import { expect, test } from '@playwright/test';

// La atribución del mapa es obligatoria: nada puede taparla, tampoco en los
// móviles más pequeños.
for (const width of [320, 390]) {
  test(`móvil ${width}px: la atribución del mapa queda libre y los botones no se pisan`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 700 });
    await page.goto('/es');
    const attribution = page.locator('.maplibregl-ctrl-attrib');
    await expect(attribution).toBeVisible();
    const attr = (await attribution.boundingBox())!;

    const area = page.getByRole('navigation', { name: 'Vista' });
    const near = page.getByRole('button', { name: 'Cerca de mí' });
    const a = (await area.boundingBox())!;
    const n = (await near.boundingBox())!;

    // Ni el conmutador ni «Cerca de mí» llegan a la atribución.
    expect(a.y + a.height).toBeLessThan(attr.y);
    expect(n.y + n.height).toBeLessThan(attr.y);
    // Y no se solapan entre sí.
    const overlap =
      a.x < n.x + n.width &&
      n.x < a.x + a.width &&
      a.y < n.y + n.height &&
      n.y < a.y + a.height;
    expect(overlap).toBe(false);
    // Nada se sale de la pantalla.
    expect(a.x).toBeGreaterThanOrEqual(0);
    expect(n.x + n.width).toBeLessThanOrEqual(width);
  });
}
