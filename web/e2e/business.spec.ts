import { expect, test } from '@playwright/test';

test('soy de un negocio: solo cifras, en 4 pasos', async ({ page }) => {
  await page.goto('/es/business');
  await expect(
    page.getByRole('heading', { name: 'Cuenta tu equipo' }),
  ).toBeVisible();

  // Sin elegir el local no se avanza.
  await page.getByRole('button', { name: 'Empezar' }).click();
  await expect(page.locator('p[role=alert]')).toContainText('Elige tu local');
  await page.getByLabel('¿De qué local se trata?').selectOption({
    label: '[DEMO] Café Paso a Paso · Malasaña',
  });
  await page.getByRole('button', { name: 'Empezar' }).click();

  // Hay que elegir qué mostrar.
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('p[role=alert]')).toContainText('Elige una opción');
  await page.getByLabel(/Solo cifras/).check();
  await page.getByRole('button', { name: 'Continuar' }).click();

  // Las cifras tienen que tener sentido: con discapacidad, entre 1 y el total.
  await page.getByLabel('Personas en el equipo').fill('8');
  await page.getByLabel('De ellas, con discapacidad').fill('9');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('p[role=alert]')).toContainText(
    'no más que el total',
  );
  await page.getByLabel('De ellas, con discapacidad').fill('3');
  await page.getByRole('button', { name: 'Continuar' }).click();

  // La vista previa es la ficha real; sin correo y sin responsabilidad no se envía.
  await expect(page.getByText('3 de 8 personas')).toBeVisible();
  await page.getByRole('button', { name: 'Enviar a revisión' }).click();
  await expect(page.locator('p[role=alert]').first()).toContainText(
    'correo válido',
  );
  await page.getByLabel('Correo de contacto').fill('negocio@ejemplo.org');
  await page.getByRole('button', { name: 'Enviar a revisión' }).click();
  await expect(page.locator('p[role=alert]')).toContainText('Marca la casilla');
  await page.getByLabel(/Soy responsable del negocio/).check();
  await page.getByRole('button', { name: 'Enviar a revisión' }).click();
  await expect(page.getByRole('heading', { name: '¡Gracias!' })).toBeFocused();
});

test('soy de un negocio: una historia no se envía sin el permiso de la persona', async ({
  page,
}) => {
  await page.goto('/es/business');
  await page
    .getByLabel('¿De qué local se trata?')
    .selectOption('demo-la-masa-madre');
  await page.getByRole('button', { name: 'Empezar' }).click();
  await page.getByLabel(/Historias con nombre/).check();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel('Personas en el equipo').fill('11');
  await page.getByLabel('De ellas, con discapacidad').fill('4');
  await page.getByRole('button', { name: 'Cocina' }).click();

  await page.getByLabel('Nombre o seudónimo').fill('Persona de ejemplo');
  await page.getByLabel('Puesto', { exact: true }).fill('Cocina');
  await page
    .getByLabel('Su historia, con sus palabras')
    .fill('Texto de ejemplo.');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('p[role=alert]')).toContainText('marca el permiso');

  await page.getByLabel(/Doy mi permiso/).check();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText('4 de 11 personas')).toBeVisible();
  await expect(page.getByText('Persona de ejemplo')).toBeVisible();
  await expect(page.getByText('Áreas: cocina')).toBeVisible();
});

test('soy de un negocio: en un equipo pequeño solo se muestra la cifra', async ({
  page,
}) => {
  await page.goto('/es/business');
  await page
    .getByLabel('¿De qué local se trata?')
    .selectOption('demo-la-masa-madre');
  await page.getByRole('button', { name: 'Empezar' }).click();
  await page.getByLabel(/Áreas y tipos/).check();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel('Personas en el equipo').fill('3');
  await page.getByLabel('De ellas, con discapacidad').fill('1');
  await expect(page.getByText('En equipos pequeños')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cocina' })).toHaveCount(0);
});

test('soy de un negocio: existe en inglés y ya no es «próximamente»', async ({
  page,
}) => {
  await page.goto('/en/business');
  await expect(
    page.getByRole('heading', { name: 'Tell us about your team' }),
  ).toBeVisible();
});

test('soy de un negocio: desde la ficha, el local ya viene elegido', async ({
  page,
}) => {
  await page.goto('/es/place/demo-la-masa-madre');
  await page.getByRole('link', { name: /¿Es tu local\?/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Cuenta tu equipo' }),
  ).toBeVisible();
  await expect(page.getByLabel('¿De qué local se trata?')).toHaveValue(
    'demo-la-masa-madre',
  );
  // Sin tocar nada más, se puede seguir al paso 2.
  await page.getByRole('button', { name: 'Empezar' }).click();
  await expect(page.getByText('Paso 2 de 4')).toBeVisible();
});
