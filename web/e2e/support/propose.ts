import type { Page } from './test';

// Rellena lo obligatorio del paso 1 de «Proponer un local»: nombre, país,
// calle y ciudad.
export async function fillPlace(page: Page, name: string) {
  await page.getByLabel('Nombre del local').fill(name);
  await page.getByLabel('País').selectOption('ES');
  await page.getByLabel('Dirección').fill('Calle Mayor 5');
  await page.getByLabel('Ciudad').fill('Madrid');
}
