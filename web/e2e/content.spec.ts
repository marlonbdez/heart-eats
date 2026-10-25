import { expect, test } from './support/test';

test('las páginas de contenido existen en español y en inglés', async ({
  page,
}) => {
  await page.goto('/es/about');
  await expect(
    page.getByRole('heading', { name: 'Qué es HeartEats', level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Por qué existe' }),
  ).toBeVisible();

  await page.goto('/es/verification');
  await expect(
    page.getByRole('heading', { name: 'Cómo verificamos', level: 1 }),
  ).toBeVisible();
  // Los pasos de una propuesta van en una lista numerada.
  await expect(page.locator('main ol li')).toHaveCount(5);

  await page.goto('/en/about');
  await expect(
    page.getByRole('heading', { name: 'What is HeartEats', level: 1 }),
  ).toBeVisible();

  await page.goto('/en/verification');
  await expect(
    page.getByRole('heading', { name: 'How we verify', level: 1 }),
  ).toBeVisible();
});

test('«Cómo ayudar»: una forma para casi todo el mundo, en español y en inglés', async ({
  page,
}) => {
  await page.goto('/es/contribute');
  await expect(
    page.getByRole('heading', { name: 'Cómo ayudar', level: 1 }),
  ).toBeVisible();
  for (const name of [
    'Programar',
    'Diseñar y cuidar la accesibilidad',
    'Moderar y verificar locales',
    'Traducir y revisar textos',
    'Proponer locales y corregir datos',
    'Una cosa que no cambia',
  ]) {
    await expect(page.getByRole('heading', { name, level: 2 })).toBeVisible();
  }
  // Lo que promete es lo que hay: cada vía lleva a un sitio real.
  await expect(
    page.getByRole('link', { name: 'Cómo proponer un cambio' }),
  ).toHaveAttribute('href', /CONTRIBUTING\.md$/);
  await expect(
    page.getByRole('link', { name: 'Escribir a contact@hearteats.org' }),
  ).toHaveAttribute('href', 'mailto:contact@hearteats.org');
  await expect(
    page.locator('main').getByRole('link', { name: 'Proponer un local' }),
  ).toHaveAttribute('href', '/es/propose');

  await page.goto('/en/contribute');
  await expect(
    page.getByRole('heading', { name: 'How to help', level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(6);
});

test('«Cómo ayudar» está en el menú lateral, en «Participar»', async ({
  page,
}) => {
  await page.goto('/es');
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await page
    .getByRole('dialog', { name: 'Menú' })
    .getByRole('link', { name: 'Cómo ayudar' })
    .click();
  await expect(page).toHaveURL(/\/es\/contribute$/);
});

test('las licencias dicen lo que hacemos: sin ODbL ni descargas de datos', async ({
  page,
}) => {
  for (const path of ['/es/legal', '/es/privacy', '/es/about']) {
    await page.goto(path);
    await expect(page.locator('main')).not.toContainText('ODbL');
  }
  await page.goto('/es/legal');
  await expect(page.locator('main')).toContainText(
    'todos los derechos reservados',
  );
  await expect(page.locator('main')).toContainText('de forma masiva');
});
