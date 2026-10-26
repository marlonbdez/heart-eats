import { expect, test, type Page } from './support/test';
import { fillPlace } from './support/propose';

test.use({ viewport: { width: 375, height: 800 } });

const overflow = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

test.describe('la ficha', () => {
  test('lista lo que ofrece el local, debajo del horario, y avisa de confirmarlo', async ({
    page,
  }) => {
    await page.goto('/es/place/demo-la-masa-madre');
    const section = page.getByRole('region', {
      name: 'Accesibilidad del local',
    });
    await expect(section.getByRole('listitem')).toHaveText([
      '✓Entrada sin escalones',
      '✓Baño adaptado',
      '✓Ambiente tranquilo',
    ]);
    await expect(section).toContainText('confírmalo con el local');

    // Va tras el horario y antes de los platos.
    const y = async (name: string) =>
      (await page.getByRole('heading', { name }).boundingBox())!.y;
    expect(await y('Horario')).toBeLessThan(await y('Accesibilidad del local'));
    expect(await y('Accesibilidad del local')).toBeLessThan(
      await y('Lo que te recomendamos probar'),
    );
  });

  test('sin datos no se dice nada: tampoco que no la haya', async ({
    page,
  }) => {
    await page.goto('/es/place/demo-sakura-shokudo');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Accesibilidad/ }),
    ).toHaveCount(0);
  });

  test('está en inglés', async ({ page }) => {
    await page.goto('/en/place/demo-la-masa-madre');
    const section = page.getByRole('region', {
      name: 'Accessibility of the place',
    });
    await expect(section).toContainText('Step-free entrance');
    await expect(section).toContainText('check with the place');
  });

  test('en 320 px cabe, también con letra ancha', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/es/place/demo-la-masa-madre');
    await page.addStyleTag({
      content: '* { font-family: Verdana !important; }',
    });
    await expect(
      page.getByRole('heading', { name: 'Accesibilidad del local' }),
    ).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  test('en escritorio acompaña al horario en la columna de la derecha', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/es/place/demo-la-masa-madre');
    const hours = (await page
      .getByRole('heading', { name: 'Horario' })
      .boundingBox())!;
    const access = (await page
      .getByRole('heading', { name: 'Accesibilidad del local' })
      .boundingBox())!;
    expect(Math.abs(access.x - hours.x)).toBeLessThan(2);
    expect(access.y).toBeGreaterThan(hours.y);
  });
});

test.describe('proponer un local', () => {
  const group = (page: Page) =>
    page.getByRole('group', { name: /Accesibilidad del local/ });

  test('es opcional y viaja con la propuesta en el orden de la ficha', async ({
    page,
    sent,
  }) => {
    await page.goto('/es/propose');
    await fillPlace(page, 'Casa Marta');
    await group(page).getByLabel('Ambiente tranquilo').check();
    await group(page).getByLabel('Entrada sin escalones').check();
    await group(page).getByLabel('Baño adaptado').check();
    await group(page).getByLabel('Baño adaptado').uncheck();
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: 'Continuar' }).click();
    }
    await page.getByRole('button', { name: 'Enviar propuesta' }).click();
    await expect(
      page.getByRole('heading', { name: '¡Gracias por proponerlo!' }),
    ).toBeFocused();
    expect(sent.find((s) => s.path === '/proposals')!.body).toMatchObject({
      accessibility: ['step_free_entrance', 'quiet_space'],
    });
  });

  test('sin marcar nada, la propuesta no lleva la clave', async ({
    page,
    sent,
  }) => {
    await page.goto('/es/propose');
    await fillPlace(page, 'Casa Marta');
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: 'Continuar' }).click();
    }
    await page.getByRole('button', { name: 'Enviar propuesta' }).click();
    await expect(
      page.getByRole('heading', { name: '¡Gracias por proponerlo!' }),
    ).toBeFocused();
    expect(
      sent.find((s) => s.path === '/proposals')!.body.accessibility,
    ).toBeUndefined();
  });

  test('el borrador recuerda lo marcado', async ({ page }) => {
    await page.goto('/es/propose');
    await fillPlace(page, 'Casa Marta');
    await group(page).getByLabel('Carta en lectura fácil').check();
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.localStorage.getItem('hearteats:draft-propose'),
        ),
      )
      .toContain('easy_read_menu');
    await page.reload();
    await expect(
      group(page).getByLabel('Carta en lectura fácil'),
    ).toBeChecked();
    await expect(group(page).getByLabel('Baño adaptado')).not.toBeChecked();
  });

  test('en 320 px cabe, también con letra ancha', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/es/propose');
    await page.addStyleTag({
      content: '* { font-family: Verdana !important; }',
    });
    await expect(group(page)).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
});

test.describe('moderación', () => {
  test('una propuesta muestra la accesibilidad que dio quien propone', async ({
    page,
    session,
  }) => {
    session.role = 'admin';
    await page.goto('/es/moderation');
    await page.getByRole('button', { name: /Casa Marta/ }).click();
    await expect(
      page.getByText('Entrada sin escalones · Carta en lectura fácil'),
    ).toBeVisible();
  });

  test('una corrección manda la lista completa, y vacía si no se marca nada', async ({
    page,
    sent,
    session,
  }) => {
    session.role = 'admin';
    await page.goto('/es/moderation');
    await page
      .getByRole('button', { name: /Corrección.*Café Paso a Paso/s })
      .click();
    await page.getByLabel('He comprobado que el cambio es correcto').check();

    // Sin tocar «Cambiar la accesibilidad», no se manda nada de ella.
    await page.getByLabel('Calle', { exact: true }).fill('Calle del Pez 9');
    await page.getByLabel('Cambiar la accesibilidad').check();
    await page.getByLabel('Baño adaptado').check();
    await page.getByLabel('Atención en lengua de signos').check();
    await page.getByLabel('Entrada sin escalones').check();
    await page.getByRole('button', { name: 'Aprobar cambio' }).click();
    await expect(page.getByRole('status')).toHaveText('Cambio aplicado');
    expect(sent).toEqual([
      {
        path: '/suggestions/s3/decision',
        body: {
          action: 'approve',
          address: { street: 'Calle del Pez 9' },
          accessibility: [
            'step_free_entrance',
            'accessible_restroom',
            'sign_language',
          ],
        },
      },
    ]);
  });

  test('cambiar la accesibilidad sin marcar nada la deja sin datos', async ({
    page,
    sent,
    session,
  }) => {
    session.role = 'admin';
    await page.goto('/es/moderation');
    await page
      .getByRole('button', { name: /Corrección.*Café Paso a Paso/s })
      .click();
    await page.getByLabel('He comprobado que el cambio es correcto').check();
    await page.getByLabel('Cambiar la accesibilidad').check();
    await page.getByRole('button', { name: 'Aprobar cambio' }).click();
    await expect(page.getByRole('status')).toHaveText('Cambio aplicado');
    expect(sent[0]!.body).toEqual({ action: 'approve', accessibility: [] });
  });
});
