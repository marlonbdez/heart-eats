import { expect, test } from './support/test';

test('la tarjeta del pin lleva la foto al lado y toda ella abre la ficha', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/es/map');
  await page.locator('[data-marker]').first().click();
  const card = page.getByRole('complementary');
  await expect(card).toBeVisible();

  // Foto a la izquierda, a todo el alto de la tarjeta, con el plato, el barrio y el sello.
  const box = (await card.boundingBox())!;
  const photo = (await card.locator('img, [role="img"]').first().boundingBox())!;
  expect(photo.x).toBeLessThanOrEqual(box.x + 2);
  expect(photo.width).toBeGreaterThanOrEqual(100);
  expect(Math.abs(photo.height - (box.height - 2))).toBeLessThan(3);
  await expect(card).toContainText('Plato estrella');
  await expect(card).toContainText('Equipo inclusivo');
  // No tapa la atribución del mapa ni ocupa media pantalla.
  const attr = (await page.locator('.maplibregl-ctrl-attrib').boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(attr.y);
  expect(box.height).toBeLessThan(800 * 0.3);

  // Un toque sobre la foto abre la ficha.
  await card.click({ position: { x: 20, y: 20 } });
  await expect(page).toHaveURL(/\/es\/place\/demo-.*from=map/);
});

test('cerrar la tarjeta sigue funcionando y no abre la ficha', async ({
  page,
}) => {
  await page.goto('/es/map');
  const marker = page.locator('[data-marker]').first();
  await marker.click();
  await page.getByRole('button', { name: 'Cerrar vista previa' }).click();
  await expect(page.getByRole('complementary')).toHaveCount(0);
  await expect(page).toHaveURL(/\/es\/map$/);
  await expect(marker).toBeFocused();
});

for (const width of [320, 390]) {
  test(`mapa ${width}px: la tarjeta del pin cabe, también con letra ancha`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 700 });
    await page.goto('/es/map');
    await page.locator('[data-marker]').first().click();
    const card = page.getByRole('complementary');
    await expect(card).toBeVisible();
    await page.addStyleTag({
      content: '* { font-family: Verdana !important; }',
    });
    const box = (await card.boundingBox())!;
    const close = (await page
      .getByRole('button', { name: 'Cerrar vista previa' })
      .boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    // El texto no pasa por debajo del botón de cerrar.
    const name = (await card.getByRole('heading').boundingBox())!;
    expect(name.x + name.width).toBeLessThanOrEqual(close.x + 1);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(0);
  });
}
