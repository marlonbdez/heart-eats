import { expect, test } from './support/test';

// Hasta el lanzamiento, la web está cerrada a buscadores (docs/14_PRODUCCION.md,
// «Abrir a buscadores»). Si esta prueba falla porque se ha abierto a propósito,
// se actualiza en la misma PR.
test('cerrada a buscadores: robots.txt y etiqueta noindex', async ({
  page,
  request,
}) => {
  const robots = await request.get('/robots.txt');
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toMatch(/^Disallow: \/$/m);

  for (const path of ['/es', '/en', '/es/propose', '/es/place/_']) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
  }
});
