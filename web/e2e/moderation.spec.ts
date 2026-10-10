import { expect, test } from '@playwright/test';

test('moderación en móvil: lista, detalle y aprobar una corrección', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/es/moderation');
  await expect(page.getByRole('heading', { name: 'Moderación' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Pendientes (4)' }),
  ).toBeVisible();

  // En el móvil, el detalle sustituye a la lista.
  await page.getByRole('button', { name: /Café Paso a Paso/ }).click();
  await expect(
    page.getByRole('heading', { name: '[DEMO] Café Paso a Paso' }),
  ).toBeFocused();
  await expect(page.getByRole('button', { name: /Pendientes/ })).toBeHidden();
  await expect(page.getByText('9:00 – 21:00')).toBeVisible();
  await expect(page.getByText('9:00 – 15:00')).toBeVisible();

  // Sin la comprobación no se aprueba.
  await page.getByRole('button', { name: 'Aprobar cambio' }).click();
  await expect(page.locator('p[role=alert]')).toContainText(
    'Marca la comprobación',
  );
  await page.getByLabel('He comprobado que el cambio es correcto').check();
  await page.getByRole('button', { name: 'Aprobar cambio' }).click();
  await expect(page.getByRole('status')).toHaveText('Cambio aplicado');
  await expect(page.getByText(/aprobó el cambio en/)).toBeVisible();

  // Vuelve a la lista: ya queda una menos y está en «Resueltas».
  await page.getByRole('button', { name: 'Volver a la lista' }).click();
  await expect(
    page.getByRole('button', { name: 'Pendientes (3)' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Resueltas (1)' }).click();
  await expect(
    page.getByRole('button', { name: /Café Paso a Paso/ }),
  ).toBeVisible();
});

test('moderación: un local nuevo exige comprobaciones, nivel y método', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/es/moderation');
  await page.getByRole('button', { name: /Cocina del Pilar/ }).click();
  await page.getByRole('button', { name: 'Aprobar y publicar' }).click();
  await expect(page.locator('p[role=alert]')).toContainText(
    'Faltan comprobaciones',
  );
  for (const name of [
    'El local existe',
    'Es un negocio independiente',
    'Hay pruebas',
    'El negocio ha confirmado',
  ]) {
    await page.getByLabel(name).check();
  }
  await page.getByRole('button', { name: 'Aprobar y publicar' }).click();
  await expect(page.locator('p[role=alert]')).toContainText('Elige el nivel');
  await page.getByLabel(/Confirmado · lo confirma/).check();
  await page.getByLabel('Llamada al negocio').check();
  await page.getByRole('button', { name: 'Aprobar y publicar' }).click();
  await expect(page.getByRole('status')).toHaveText('Aprobada y publicada');
  await expect(page.getByText(/como Confirmado \(llamada\)/)).toBeVisible();
});

test('moderación: rechazar pide motivo y pedir información pide nota', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/es/moderation');
  await page.getByRole('button', { name: /Burger Mega Express/ }).click();
  await expect(page.getByText(/Parece una cadena/)).toBeVisible();

  await page.getByRole('button', { name: 'Pedir más información' }).click();
  await page.getByRole('button', { name: 'Enviar petición' }).click();
  await expect(page.locator('p[role=alert]')).toContainText('Escribe qué');
  await page.getByRole('button', { name: 'Cancelar' }).click();

  await page.getByRole('button', { name: 'Rechazar' }).click();
  await page.getByRole('button', { name: 'Confirmar rechazo' }).click();
  await expect(page.locator('p[role=alert]')).toContainText('Elige un motivo');
  await page.getByLabel('No es independiente').check();
  await page.getByRole('button', { name: 'Confirmar rechazo' }).click();
  await expect(page.getByRole('status')).toHaveText('Rechazada');
});

test('moderación en escritorio: lista y detalle se ven a la vez', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/es/moderation');
  await expect(page.getByText('Elige una solicitud')).toBeVisible();
  await page.getByRole('button', { name: /Cocina del Pilar/ }).click();
  await expect(
    page.getByRole('button', { name: 'Pendientes (4)' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Cocina del Pilar' }),
  ).toBeVisible();
});

test('moderación: existe en inglés', async ({ page }) => {
  await page.goto('/en/moderation');
  await expect(page.getByRole('heading', { name: 'Moderation' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pending (4)' })).toBeVisible();
});

test('se llega a moderación desde el menú, en el móvil', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/es');
  await page.locator('button[aria-haspopup="dialog"]').click();
  await page
    .getByRole('dialog')
    .getByRole('link', { name: 'Moderar propuestas (demo)' })
    .click();
  await expect(page).toHaveURL(/\/es\/moderation$/);
  await expect(page.getByRole('heading', { name: 'Moderación' })).toBeVisible();
});
