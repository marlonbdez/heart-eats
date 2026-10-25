import { expect, test } from './support/test';

test('quien solo modera ve solicitudes y fotos, no las secciones de administración', async ({
  page,
  session,
}) => {
  session.role = 'moderator';
  await page.goto('/es/moderation');
  await expect(page.getByRole('button', { name: /Pendientes/ })).toBeVisible();
  const sections = page.getByRole('group', { name: 'Secciones' });
  await expect(sections.getByRole('button')).toHaveText([
    'Solicitudes',
    'Fotos',
  ]);
  await expect(page.getByRole('button', { name: 'Retiradas' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Usuarios' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Registro' })).toBeHidden();
});

test.describe('administración', () => {
  test.beforeEach(async ({ session, page }) => {
    session.role = 'admin';
    await page.goto('/es/moderation');
  });

  test.describe('usuarios', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: 'Usuarios' }).click();
    });

    test('lista a quien tiene acceso y a quien está de baja', async ({
      page,
    }) => {
      await expect(
        page.getByRole('heading', { name: 'Quién modera' }),
      ).toBeVisible();
      const lucia = page.getByRole('listitem').filter({ hasText: 'lucia@' });
      await expect(lucia).toContainText('Moderador');
      await expect(lucia).toContainText('decide en ES · Madrid');
      await expect(
        lucia.getByRole('button', { name: 'Dar de baja a lucia@ejemplo.org' }),
      ).toBeVisible();

      const baja = page.getByRole('listitem').filter({ hasText: 'baja@' });
      await expect(baja).toContainText('De baja desde el');
      await expect(baja.getByRole('button')).toHaveCount(0);

      // Un administrador no se da de baja desde aquí.
      const admin = page.getByRole('listitem').filter({ hasText: 'admin@' });
      await expect(admin).toContainText('Administrador');
      await expect(admin.getByRole('button')).toHaveCount(0);
    });

    test('invitar pide un correo y un país válidos y envía el ámbito', async ({
      page,
      sent,
    }) => {
      await page.getByRole('button', { name: 'Dar de alta' }).click();
      await expect(page.locator('p[role=alert]')).toContainText(
        'correo válido',
      );
      await page.getByLabel('Correo').fill('nueva@ejemplo.org');
      await page.getByLabel('País (dos letras)').fill('E');
      await page.getByRole('button', { name: 'Dar de alta' }).click();
      await expect(page.locator('p[role=alert]')).toContainText('dos letras');
      expect(sent).toEqual([]);

      await page.getByLabel('País (dos letras)').fill('es');
      await page.getByRole('button', { name: 'Dar de alta' }).click();
      await expect(page.getByRole('status')).toContainText(
        'nueva@ejemplo.org ya puede pedir su enlace de acceso',
      );
      expect(sent).toEqual([
        {
          path: '/users',
          body: {
            email: 'nueva@ejemplo.org',
            moderationScope: [{ country: 'es', city: 'Madrid' }],
          },
        },
      ]);
      await expect(
        page.getByRole('listitem').filter({ hasText: 'nueva@' }),
      ).toContainText('Moderador');
      await expect(page.getByLabel('Correo')).toHaveValue('');
    });

    test('la ciudad es opcional', async ({ page, sent }) => {
      await page.getByLabel('Correo').fill('nueva@ejemplo.org');
      await page.getByLabel(/Ciudad/).fill('');
      await page.getByRole('button', { name: 'Dar de alta' }).click();
      await expect(page.getByRole('status')).toBeVisible();
      expect(sent[0]?.body).toEqual({
        email: 'nueva@ejemplo.org',
        moderationScope: [{ country: 'ES' }],
      });
    });

    test('quien ya tiene acceso lo dice; quien estaba de baja se repone', async ({
      page,
    }) => {
      await page.getByLabel('Correo').fill('lucia@ejemplo.org');
      await page.getByRole('button', { name: 'Dar de alta' }).click();
      await expect(page.locator('p[role=alert]')).toContainText(
        'ya tiene acceso',
      );

      await page.getByLabel('Correo').fill('baja@ejemplo.org');
      await page.getByRole('button', { name: 'Dar de alta' }).click();
      await expect(page.getByRole('status')).toBeVisible();
      const baja = page.getByRole('listitem').filter({ hasText: 'baja@' });
      await expect(baja).toContainText('Alta el');
      await expect(baja).not.toContainText('De baja');
      await expect(page.getByRole('listitem')).toHaveCount(3);
    });

    test('dar de baja pide confirmación y deja el foco en la fila', async ({
      page,
      sent,
    }) => {
      const lucia = page.getByRole('listitem').filter({ hasText: 'lucia@' });
      await lucia.getByRole('button', { name: /Dar de baja a/ }).click();
      await expect(lucia).toContainText('Perderá el acceso ahora mismo');
      await lucia.getByRole('button', { name: 'Cancelar' }).click();
      await expect(lucia).not.toContainText('Perderá el acceso');
      expect(sent).toEqual([]);

      await lucia.getByRole('button', { name: /Dar de baja a/ }).click();
      await lucia.getByRole('button', { name: 'Confirmar baja' }).click();
      await expect(lucia).toContainText('De baja desde el');
      await expect(lucia.getByRole('button')).toHaveCount(0);
      await expect(lucia).toBeFocused();
      expect(sent).toEqual([{ path: '/users/u2', body: {} }]);
    });

    test('en 320 px, con una fuente ancha, nada se sale de la pantalla', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 700 });
      await page.addStyleTag({
        content: '* { font-family: Verdana !important }',
      });
      const overflows = () =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth,
        );
      await page
        .getByRole('listitem')
        .filter({ hasText: 'lucia@' })
        .getByRole('button', { name: /Dar de baja a/ })
        .click();
      expect(await overflows()).toBe(false);
      await page.getByRole('button', { name: 'Registro' }).click();
      await expect(page.getByText('Alta de moderador')).toBeVisible();
      expect(await overflows()).toBe(false);
    });
  });

  test.describe('retiradas', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: 'Retiradas' }).click();
    });

    test('lista las fichas y las historias pendientes de borrar, con su fecha', async ({
      page,
    }) => {
      await expect(
        page.getByRole('heading', { name: 'Retiradas', level: 2 }),
      ).toBeVisible();
      const listings = page
        .getByRole('listitem')
        .filter({ hasText: 'Retirada el' });
      const lola = listings.filter({ hasText: 'Casa Lola' }).first();
      await expect(lola).toContainText('Madrid');
      await expect(lola).toContainText('en 12 días');
      await expect(listings.filter({ hasText: 'Bar Esperanza' })).toContainText(
        'en 28 días',
      );
      // Las historias salen por local y posición, nunca con su contenido, y
      // no se pueden restaurar.
      const story = page
        .getByRole('listitem')
        .filter({ hasText: 'historia 2' });
      await expect(story).toContainText('Casa Lola');
      await expect(story).toContainText('en 18 días');
      await expect(story.getByRole('button')).toHaveCount(0);
      await expect(page.getByText(/No se pueden restaurar/)).toBeVisible();
    });

    test('restaurar una ficha pide confirmación, la quita de la lista y deja el foco en el aviso', async ({
      page,
      sent,
    }) => {
      const bar = page
        .getByRole('listitem')
        .filter({ hasText: 'Bar Esperanza' });
      await bar
        .getByRole('button', { name: 'Restaurar Bar Esperanza' })
        .click();
      await expect(bar).toContainText('Volverá a verse en el mapa ahora mismo');
      await bar.getByRole('button', { name: 'Cancelar' }).click();
      await expect(bar).not.toContainText('Volverá a verse');
      expect(sent).toEqual([]);

      await bar
        .getByRole('button', { name: 'Restaurar Bar Esperanza' })
        .click();
      await bar.getByRole('button', { name: 'Confirmar restauración' }).click();
      const notice = page.getByRole('status');
      await expect(notice).toHaveText(
        'Listo: Bar Esperanza vuelve a verse en HeartEats.',
      );
      await expect(notice).toBeFocused();
      await expect(bar).toHaveCount(0);
      expect(sent).toEqual([
        { path: '/retired/listings/rl2/restore', body: {} },
      ]);
    });

    test('si la ficha ya no estaba, lo dice y la quita de la lista', async ({
      page,
    }) => {
      const ghost = page
        .getByRole('listitem')
        .filter({ hasText: 'Cafetería Fantasma' });
      await ghost
        .getByRole('button', { name: 'Restaurar Cafetería Fantasma' })
        .click();
      await ghost
        .getByRole('button', { name: 'Confirmar restauración' })
        .click();
      await expect(page.locator('p[role=alert]')).toContainText(
        'Cafetería Fantasma ya no estaba pendiente de borrar',
      );
      await expect(ghost).toHaveCount(0);
    });

    test('si no hay nada retirado, lo dice con calma', async ({ page }) => {
      await page.route('**/api/v1/retired', (route) =>
        route.fulfill({
          headers: {
            'access-control-allow-origin':
              route.request().headers()['origin'] ?? '*',
            'access-control-allow-credentials': 'true',
          },
          json: { listings: [], stories: [] },
        }),
      );
      await page.getByRole('button', { name: 'Solicitudes' }).click();
      await page.getByRole('button', { name: 'Retiradas' }).click();
      await expect(
        page.getByText('No hay ninguna ficha pendiente de borrar.'),
      ).toBeVisible();
      await expect(
        page.getByText('No hay ninguna historia pendiente de borrar.'),
      ).toBeVisible();
    });

    test('en 320 px, con una fuente ancha, nada se sale de la pantalla', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 700 });
      await page.addStyleTag({
        content: '* { font-family: Verdana !important }',
      });
      await page.getByRole('button', { name: 'Restaurar Casa Lola' }).click();
      await expect(page.getByText('Confirmar restauración')).toBeVisible();
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth,
        ),
      ).toBe(false);
    });
  });

  test.describe('registro', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: 'Registro' }).click();
    });

    test('lista lo hecho, con quién y el cambio, y carga más', async ({
      page,
    }) => {
      await expect(
        page.getByRole('heading', { name: 'Registro', level: 2 }),
      ).toBeVisible();
      const items = page.locator('main ul > li');
      await expect(items).toHaveCount(3);
      await expect(items.first()).toContainText('Persona');
      await expect(items.first()).toContainText('Alta de moderador');
      await expect(items.first()).toContainText('por admin@ejemplo.org');
      await expect(items.first()).toContainText('role: moderator');
      await expect(items.nth(1)).toContainText('Rechazada');
      await expect(items.nth(1)).toContainText('reason: duplicate');
      await expect(items.nth(2)).toContainText('Cerrada por plazo');
      await expect(items.nth(2)).toContainText('por el sistema');

      await page.getByRole('button', { name: 'Cargar más' }).click();
      await expect(items).toHaveCount(5);
      await expect(items.last()).toContainText('Inicio de sesión');
      await expect(
        page.getByRole('button', { name: 'Cargar más' }),
      ).toBeHidden();
    });

    test('filtra por lo que se tocó', async ({ page }) => {
      await page.getByLabel('Mostrar').selectOption('user');
      const items = page.locator('main ul > li');
      await expect(items).toHaveCount(2);
      await expect(items.first()).toContainText('Alta de moderador');
      await expect(items.last()).toContainText('Inicio de sesión');
      await page.getByLabel('Mostrar').selectOption('team');
      await expect(
        page.getByText('Todavía no hay nada en el registro.'),
      ).toBeVisible();
    });
  });

  test('en inglés', async ({ page }) => {
    await page.goto('/en/moderation');
    await page.getByRole('button', { name: 'Users' }).click();
    await expect(
      page.getByRole('heading', { name: 'Who moderates' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Log' }).click();
    await expect(page.getByText('Moderator added')).toBeVisible();
  });
});
