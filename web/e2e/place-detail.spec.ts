import { expect, test } from './support/test';
import type { Page } from '@playwright/test';

const PLACE = '/es/place/demo-la-masa-madre';

// La altura de cada bloque, para comprobar el orden en la página.
const top = async (page: Page, locator: ReturnType<Page['locator']>) =>
  (await locator.boundingBox())!.y;

test('la ficha va de lo que atrae a lo que informa: platos, horario, equipo y verificación', async ({
  page,
}) => {
  await page.goto(PLACE);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  // Las categorías de comida, como etiquetas bajo el nombre.
  const tags = page.getByRole('list', { name: 'Tipo de comida' });
  await expect(tags.getByRole('listitem')).toHaveText([
    'Pizza',
    'Italiana',
    'Mexicana',
  ]);

  // Cómo llegar y llamar, enseguida y antes que los platos.
  const actions = page.getByRole('navigation', { name: 'Acciones' });
  const dishes = page.getByRole('heading', {
    name: 'Lo que te recomendamos probar',
  });
  const hours = page.getByRole('heading', { name: 'Horario' });
  const team = page.getByRole('heading', { level: 2 }).filter({
    hasText: /equipo/i,
  });
  const verification = page.getByRole('heading', {
    name: /Datos (verificados|confirmados)/,
  });
  const order = [actions, dishes, hours, team, verification];
  const ys = [];
  for (const block of order) ys.push(await top(page, block));
  expect(ys).toEqual([...ys].sort((a, b) => a - b));
});

for (const [width, font] of [
  [320, 'Verdana'],
  [360, ''],
  [1280, ''],
] as const) {
  test(`la ficha cabe a ${width} px${font ? ' con letra ancha' : ''}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(PLACE);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    if (font) {
      await page.addStyleTag({
        content: `* { font-family: ${font} !important; }`,
      });
    }
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // Los platos: en columnas en pantallas anchas, uno bajo otro en el móvil.
    const dishes = page.locator('#platos + ul > li');
    const boxes = await dishes.evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().y),
    );
    expect(boxes.length).toBeGreaterThan(1);
    if (width >= 640) expect(new Set(boxes).size).toBe(1);
    else expect(new Set(boxes).size).toBe(boxes.length);
  });
}
