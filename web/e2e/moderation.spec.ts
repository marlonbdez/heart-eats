import { suggestions } from './fixtures/moderation';
import { expect, test } from './support/test';

test('sin sesión pide el correo y el enlace no revela quién modera', async ({
  page,
  sent,
}) => {
  await page.goto('/es/moderation');
  await expect(page.getByRole('heading', { name: 'Moderación' })).toBeVisible();
  await page.getByRole('button', { name: 'Enviarme el enlace' }).click();
  await expect(page.locator('#contenido p[role=alert]')).toContainText(
    'correo válido',
  );
  await page.getByLabel('Tu correo').fill('quien@ejemplo.org');
  await page.getByRole('button', { name: 'Enviarme el enlace' }).click();
  await expect(page.getByRole('status')).toContainText('Caduca en 15 minutos');
  expect(sent).toEqual([
    {
      path: '/auth/magic-link',
      body: { email: 'quien@ejemplo.org', locale: 'es' },
    },
  ]);
});

test('el enlace del correo abre la sesión y quita el token de la dirección', async ({
  page,
  sent,
}) => {
  await page.goto('/es/moderation/login#token=good');
  await expect(page).toHaveURL(/\/es\/moderation$/);
  await expect(page.getByText(/Has entrado como/)).toBeVisible();
  expect(sent).toEqual([{ path: '/auth/session', body: { token: 'good' } }]);
  expect(page.url()).not.toContain('token');
});

test('un enlace caducado o sin token lo dice y deja pedir otro', async ({
  page,
}) => {
  await page.goto('/es/moderation/login#token=viejo');
  await expect(page.locator('#contenido p[role=alert]')).toContainText(
    'no es válido o ha caducado',
  );
  await expect(page.getByLabel('Tu correo')).toBeVisible();
  await page.goto('/es/moderation/login');
  await expect(page.locator('#contenido p[role=alert]')).toContainText(
    'no es válido o ha caducado',
  );
});

test.describe('con la sesión abierta', () => {
  test.beforeEach(async ({ session }) => {
    session.role = 'admin';
  });

  test('en móvil: lista, detalle y volver', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/es/moderation');
    await expect(
      page.getByRole('button', { name: 'Pendientes (7)' }),
    ).toBeVisible();
    await page.getByRole('button', { name: /Cocina del Pilar/ }).click();
    await expect(
      page.getByRole('heading', { name: 'Cocina del Pilar' }),
    ).toBeFocused();
    await expect(page.getByRole('button', { name: /Pendientes/ })).toBeHidden();
    await expect(page.getByText('40.40850, -3.70120')).toBeVisible();
    await page.getByRole('button', { name: 'Volver a la lista' }).click();
    await page.getByRole('button', { name: 'Resueltas (1)' }).click();
    await expect(
      page.getByRole('button', { name: /Horno Viejo/ }),
    ).toBeVisible();
  });

  test('un local nuevo exige comprobaciones, nivel y método, y se envía con el sí del negocio', async ({
    page,
    sent,
  }) => {
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
    expect(sent).toEqual([
      {
        path: '/suggestions/s1/decision',
        body: {
          action: 'approve',
          level: 'community',
          method: 'call',
          ownerConfirmed: true,
        },
      },
    ]);
    await page.getByRole('button', { name: 'Volver a la lista' }).click();
    await expect(
      page.getByRole('button', { name: 'Pendientes (6)' }),
    ).toBeVisible();
  });

  test('al abrir un local nuevo se pide el detalle, que trae el pin', async ({
    page,
  }) => {
    await page.goto('/es/moderation');
    // La cola no trae el pin: llega con el detalle.
    const detail = page.waitForRequest((r) =>
      r.url().endsWith('/api/v1/suggestions/s8'),
    );
    await page.getByRole('button', { name: /Casa Marta/ }).click();
    await detail;
    await expect(page.getByText('40.41530, -3.70740')).toBeVisible();
    await expect(page.getByLabel('Latitud')).toHaveCount(0);
  });

  test('si el detalle falla, se puede poner el pin a mano', async ({
    page,
  }) => {
    await page.route('**/api/v1/suggestions/s8', (route) =>
      route.fulfill({
        status: 500,
        headers: { 'access-control-allow-origin': '*' },
        json: { error: { code: 'internal_error', message: 'Error' } },
      }),
    );
    await page.goto('/es/moderation');
    await page.getByRole('button', { name: /Casa Marta/ }).click();
    await expect(page.getByText(/No se ha encontrado/)).toBeVisible();
    await expect(page.getByLabel('Latitud')).toBeVisible();
  });

  test('un local nuevo dice su país y de dónde viene el pin', async ({
    page,
  }) => {
    await page.goto('/es/moderation');
    await page.getByRole('button', { name: /Cocina del Pilar/ }).click();
    await expect(page.getByText('sale de la dirección')).toBeVisible();
    await expect(page.getByText('España', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Volver a la lista' }).click();
    await page.getByRole('button', { name: /Casa Marta/ }).click();
    await expect(page.getByText('lo colocó quien propone')).toBeVisible();

    // Una propuesta anterior a pedir el país no lo enseña.
    await page.getByRole('button', { name: 'Volver a la lista' }).click();
    await page.getByRole('button', { name: /Burger Mega Express/ }).click();
    await expect(page.getByText('País', { exact: true })).toHaveCount(0);
  });

  test('un local con fotos las enseña y deja no publicar alguna', async ({
    page,
    sent,
  }) => {
    await page.goto('/es/moderation');
    await page.getByRole('button', { name: /Casa Marta/ }).click();

    await expect(
      page.getByRole('heading', { name: 'Fotos enviadas' }),
    ).toBeVisible();
    const photos = page.getByRole('list').filter({
      has: page.getByRole('link', { name: /Foto del local 1/ }),
    });
    await expect(photos.getByRole('listitem')).toHaveCount(2);
    // Las imágenes cargan de verdad (la API las sirve a quien tiene sesión).
    await expect
      .poll(() =>
        photos
          .locator('img')
          .first()
          .evaluate((img: HTMLImageElement) => img.naturalWidth),
      )
      .toBeGreaterThan(0);
    await expect(
      page.getByRole('link', { name: /Foto del plato «Tortilla»/ }),
    ).toHaveAttribute('target', '_blank');

    // Con fotos, hay que comprobar también las fotos.
    for (const name of [
      'El local existe',
      'Es un negocio independiente',
      'Hay pruebas',
      'El negocio ha confirmado',
      'Las fotos que se publican',
    ]) {
      await page.getByLabel(name).check();
    }
    await page.getByLabel(/Confirmado · lo confirma/).check();
    await page.getByLabel('Visita presencial').check();
    // La foto del plato no se publica.
    await page
      .getByLabel('Foto del plato «Tortilla»: No publicar esta foto')
      .check();
    await page.getByRole('button', { name: 'Aprobar y publicar' }).click();
    await expect(page.getByRole('status')).toHaveText('Aprobada y publicada');
    expect(sent).toEqual([
      {
        path: '/suggestions/s8/decision',
        body: {
          action: 'approve',
          level: 'community',
          method: 'visit',
          ownerConfirmed: true,
          skipPhotos: ['q/0b8e3a52-5a43-4b8a-9d5e-000000000002.webp'],
        },
      },
    ]);
  });

  test('sin pin se piden las coordenadas, y se envían', async ({
    page,
    sent,
  }) => {
    await page.goto('/es/moderation');
    await page.getByRole('button', { name: /Burger Mega Express/ }).click();
    await expect(page.getByText(/Parece una cadena/)).toBeVisible();
    for (const name of [
      'El local existe',
      'Es un negocio independiente',
      'Hay pruebas',
      'El negocio ha confirmado',
    ]) {
      await page.getByLabel(name).check();
    }
    await page.getByLabel(/Verificado · lo he comprobado/).check();
    await page.getByLabel('Visita presencial').check();
    await page.getByLabel('Latitud').fill('abc');
    await page.getByLabel('Longitud').fill('-3.7');
    await page.getByRole('button', { name: 'Aprobar y publicar' }).click();
    await expect(page.locator('p[role=alert]')).toContainText('no son válidas');
    await page.getByLabel('Latitud').fill('40.41');
    await page.getByRole('button', { name: 'Aprobar y publicar' }).click();
    await expect(page.getByRole('status')).toHaveText('Aprobada y publicada');
    expect(sent[0]?.body).toMatchObject({
      location: { lat: 40.41, lng: -3.7 },
    });
  });

  test('rechazar pide motivo y pedir información pide nota', async ({
    page,
    sent,
  }) => {
    await page.goto('/es/moderation');
    await page.getByRole('button', { name: /Burger Mega Express/ }).click();
    await page.getByRole('button', { name: 'Pedir más información' }).click();
    await page.getByRole('button', { name: 'Enviar petición' }).click();
    await expect(page.locator('p[role=alert]')).toContainText('Escribe qué');
    await page.getByRole('button', { name: 'Cancelar' }).click();

    await page.getByRole('button', { name: 'Rechazar' }).click();
    await page.getByRole('button', { name: 'Confirmar rechazo' }).click();
    await expect(page.locator('p[role=alert]')).toContainText(
      'Elige un motivo',
    );
    await page.getByLabel('No es independiente').check();
    await page.getByRole('button', { name: 'Confirmar rechazo' }).click();
    await expect(page.getByRole('status')).toHaveText('Rechazada');
    expect(sent).toEqual([
      {
        path: '/suggestions/s2/decision',
        body: { action: 'reject', reason: 'not_independent' },
      },
    ]);
  });

  test('una solicitud con información pedida muestra la nota y la respuesta', async ({
    page,
  }) => {
    await page.goto('/es/moderation');
    await page.getByRole('button', { name: /Casa Lola/ }).click();
    await expect(page.getByText('¿Tenéis web o redes?')).toBeVisible();
    await expect(page.getByText('Sí, está en nuestro perfil.')).toBeVisible();
    // Ya se pidió información: no se ofrece otra vez.
    await expect(
      page.getByRole('button', { name: 'Pedir más información' }),
    ).toHaveCount(0);
  });

  test('una corrección se aplica con lo que escribe quien la aprueba', async ({
    page,
    sent,
  }) => {
    await page.goto('/es/moderation');
    await page
      .getByRole('button', { name: /Corrección.*Café Paso a Paso/s })
      .click();
    await page.getByRole('button', { name: 'Aprobar cambio' }).click();
    await expect(page.locator('p[role=alert]')).toContainText(
      'Marca la comprobación',
    );
    await page.getByLabel('He comprobado que el cambio es correcto').check();
    await page.getByRole('button', { name: 'Aprobar cambio' }).click();
    await expect(page.locator('p[role=alert]')).toContainText(
      'Escribe qué cambia',
    );
    await page.getByLabel('Calle', { exact: true }).fill('Calle del Pez 9');
    await page.getByRole('button', { name: 'Aprobar cambio' }).click();
    await expect(page.getByRole('status')).toHaveText('Cambio aplicado');
    expect(sent).toEqual([
      {
        path: '/suggestions/s3/decision',
        body: { action: 'approve', address: { street: 'Calle del Pez 9' } },
      },
    ]);
  });

  test('una corrección de horario y pin envía el horario completo', async ({
    page,
    sent,
  }) => {
    await page.goto('/es/moderation');
    await page
      .getByRole('button', { name: /Corrección.*Café Paso a Paso/s })
      .click();
    await page.getByLabel('He comprobado que el cambio es correcto').check();
    await page.getByLabel('Latitud').fill('40.4231');
    await page.getByLabel('Longitud').fill('-3.7050');

    await page.getByLabel('Cambiar el horario').check();
    const day = (name: string) => page.getByRole('group', { name });
    await day('lunes').getByLabel('Abre').fill('09:00');
    await day('lunes').getByLabel('Cierra').fill('17:30');
    // Un día a medias no vale.
    await day('martes').getByLabel('Abre').fill('09:00');
    await page.getByRole('button', { name: 'Aprobar cambio' }).click();
    await expect(page.locator('p[role=alert]')).toContainText(
      'apertura y de cierre',
    );
    await day('martes').getByLabel('Cierra').fill('17:30');
    await day('domingo').getByLabel('Abre').fill('10:00');
    await day('domingo').getByLabel('Cierra').fill('14:00');
    await page.getByRole('button', { name: 'Aprobar cambio' }).click();
    await expect(page.getByRole('status')).toHaveText('Cambio aplicado');
    expect(sent).toEqual([
      {
        path: '/suggestions/s3/decision',
        body: {
          action: 'approve',
          location: { lat: 40.4231, lng: -3.705 },
          openingHours: [
            { day: 1, open: '09:00', close: '17:30' },
            { day: 2, open: '09:00', close: '17:30' },
            { day: 0, open: '10:00', close: '14:00' },
          ],
        },
      },
    ]);
  });

  test('un pin a medias o un horario vacío no se envían', async ({
    page,
    sent,
  }) => {
    await page.goto('/es/moderation');
    await page
      .getByRole('button', { name: /Corrección.*Café Paso a Paso/s })
      .click();
    await page.getByLabel('He comprobado que el cambio es correcto').check();
    await page.getByLabel('Latitud').fill('40.4231');
    await page.getByRole('button', { name: 'Aprobar cambio' }).click();
    await expect(page.locator('p[role=alert]')).toContainText(
      'coordenadas no son válidas',
    );
    await page.getByLabel('Latitud').fill('');
    await page.getByLabel('Cambiar el horario').check();
    await page.getByRole('button', { name: 'Aprobar cambio' }).click();
    await expect(page.locator('p[role=alert]')).toContainText(
      'al menos un día',
    );
    expect(sent).toEqual([]);
  });

  test('retirar una historia pide cuál, y confirma la identidad', async ({
    page,
    sent,
  }) => {
    await page.goto('/es/moderation');
    await page
      .getByRole('button', { name: /Retirada.*La Masa Madre/s })
      .click();
    await page.getByRole('button', { name: 'Retirar ahora' }).click();
    await expect(page.locator('p[role=alert]')).toContainText(
      'confirmar la identidad',
    );
    await page.getByLabel(/He confirmado, por el correo/).check();
    await page.getByRole('button', { name: 'Retirar ahora' }).click();
    await expect(page.locator('p[role=alert]')).toContainText('qué historia');
    await page.getByLabel('¿Qué historia se retira?').selectOption('2');
    await page.getByRole('button', { name: 'Retirar ahora' }).click();
    await expect(page.getByRole('status')).toContainText('Retirado');
    expect(sent).toEqual([
      {
        path: '/suggestions/s4/decision',
        body: { action: 'approve', identityConfirmed: true, storyIndex: 1 },
      },
    ]);
  });

  // La solicitud s4 es una retirada de historia; aquí se cambia lo que pide.
  async function asRemoval(what: string, run: () => Promise<void>) {
    const s4 = suggestions.find((s) => s.id === 's4')!;
    const original = s4.removal;
    s4.removal = { what, details: 'Quiero que la quiten.' };
    try {
      await run();
    } finally {
      s4.removal = original;
    }
  }

  test('retirar una foto: enlaza con «Fotos» y se marca como atendida', async ({
    page,
    sent,
  }) => {
    await asRemoval('photo', async () => {
      await page.goto('/es/moderation');
      await page
        .getByRole('button', { name: /Retirada.*La Masa Madre/s })
        .click();
      await expect(page.getByText(/Retira la foto en «Fotos»/)).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Retirar ahora' }),
      ).toHaveCount(0);

      // El enlace lleva a las fotos de ese local, sin tener que buscarlo.
      await page
        .getByRole('button', { name: 'Abrir las fotos de este local' })
        .click();
      await expect(
        page.getByRole('heading', { name: '[DEMO] La Masa Madre' }),
      ).toBeFocused();
      await expect(
        page.getByRole('heading', { name: /Fotos de la galería/ }),
      ).toBeVisible();

      // Y la solicitud se cierra de vuelta en la cola, confirmando quién pide.
      await page
        .getByRole('button', { name: 'Solicitudes', exact: true })
        .click();
      await page
        .getByRole('button', { name: /Retirada.*La Masa Madre/s })
        .click();
      await page.getByRole('button', { name: 'Marcar como atendida' }).click();
      await expect(page.locator('p[role=alert]')).toContainText(
        'confirmar la identidad',
      );
      await page.getByLabel(/He confirmado, por el correo/).check();
      await page.getByRole('button', { name: 'Marcar como atendida' }).click();
      await expect(page.getByRole('status')).toContainText('Atendida');
    });
    expect(sent).toEqual([
      {
        path: '/suggestions/s4/decision',
        body: { action: 'approve', identityConfirmed: true },
      },
    ]);
  });

  test('retirar datos: se explica que va por correo y se marca como atendida', async ({
    page,
    sent,
  }) => {
    await asRemoval('data', async () => {
      await page.goto('/es/moderation');
      await page
        .getByRole('button', { name: /Retirada.*La Masa Madre/s })
        .click();
      await expect(page.getByText(/Atiéndela por correo/)).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Abrir las fotos de este local' }),
      ).toHaveCount(0);
      await page.getByLabel(/He confirmado, por el correo/).check();
      await page.getByRole('button', { name: 'Marcar como atendida' }).click();
      await expect(page.getByRole('status')).toContainText('Atendida');
    });
    expect(sent).toEqual([
      {
        path: '/suggestions/s4/decision',
        body: { action: 'approve', identityConfirmed: true },
      },
    ]);
  });

  test('aprobar el equipo: se leen las historias y se confirma al negocio', async ({
    page,
    sent,
  }) => {
    await page.goto('/es/moderation');
    await page
      .getByRole('button', { name: /Equipo.*Café Paso a Paso/s })
      .click();
    await expect(page.getByText('4 de 9 con discapacidad')).toBeVisible();
    await expect(
      page.getByText('Texto de ejemplo de una historia.'),
    ).toBeVisible();
    await expect(page.getByText(/Persona de ejemplo · Cocina/)).toBeVisible();

    // Sin las comprobaciones no se publica.
    await page
      .getByRole('button', { name: 'Aprobar y publicar el equipo' })
      .click();
    await expect(page.locator('p[role=alert]')).toContainText(
      'Faltan comprobaciones',
    );
    for (const name of [
      /He confirmado con el negocio/,
      /Las cifras son coherentes/,
      /Cada historia trae el consentimiento/,
      /Cada foto es de la persona de su historia/,
    ]) {
      await page.getByLabel(name).check();
    }
    await page
      .getByRole('button', { name: 'Aprobar y publicar el equipo' })
      .click();
    await expect(page.getByRole('status')).toHaveText('Equipo publicado');
    expect(sent).toEqual([
      {
        path: '/suggestions/s7/decision',
        body: { action: 'approve', ownerConfirmed: true },
      },
    ]);
  });

  test('aprobar el equipo: se ve la foto de cada persona y se puede dejar fuera', async ({
    page,
    sent,
  }) => {
    await page.goto('/es/moderation');
    await page
      .getByRole('button', { name: /Equipo.*Café Paso a Paso/s })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Fotos enviadas' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', {
        name: /Foto de Persona de ejemplo\. Abrir la foto en grande/,
      }),
    ).toHaveAttribute('href', /\/suggestions\/s7\/photos\/.*\.webp$/);

    for (const name of [
      /He confirmado con el negocio/,
      /Las cifras son coherentes/,
      /Cada historia trae el consentimiento/,
      /Cada foto es de la persona de su historia/,
    ]) {
      await page.getByLabel(name).check();
    }
    await page
      .getByLabel('Foto de Persona de ejemplo: No publicar esta foto')
      .check();
    await page
      .getByRole('button', { name: 'Aprobar y publicar el equipo' })
      .click();
    await expect(page.getByRole('status')).toHaveText('Equipo publicado');
    expect(sent).toEqual([
      {
        path: '/suggestions/s7/decision',
        body: {
          action: 'approve',
          ownerConfirmed: true,
          skipPhotos: ['q/0b8e3a52-5a43-4b8a-9d5e-0000000000a1.webp'],
        },
      },
    ]);
  });

  test('si no caben las historias nuevas, lo dice', async ({ page }) => {
    await page.route('**/suggestions/s7/decision', (route) =>
      route.fulfill({
        status: 422,
        headers: {
          'access-control-allow-origin': 'http://localhost:4173',
          'access-control-allow-credentials': 'true',
        },
        json: { error: { code: 'too_many_stories', message: 'Muchas' } },
      }),
    );
    await page.goto('/es/moderation');
    await page
      .getByRole('button', { name: /Equipo.*Café Paso a Paso/s })
      .click();
    for (const name of [
      /He confirmado con el negocio/,
      /Las cifras son coherentes/,
      /Cada historia trae el consentimiento/,
      /Cada foto es de la persona de su historia/,
    ]) {
      await page.getByLabel(name).check();
    }
    await page
      .getByRole('button', { name: 'Aprobar y publicar el equipo' })
      .click();
    await expect(page.locator('p[role=alert]')).toContainText('máximo 3');
  });

  test('si otra persona decidió antes, lo dice', async ({ page }) => {
    await page.route('**/suggestions/s2/decision', (route) =>
      route.fulfill({
        status: 409,
        headers: {
          'access-control-allow-origin': 'http://localhost:4173',
          'access-control-allow-credentials': 'true',
        },
        json: { error: { code: 'conflict', message: 'Cambió' } },
      }),
    );
    await page.goto('/es/moderation');
    await page.getByRole('button', { name: /Burger Mega Express/ }).click();
    await page.getByRole('button', { name: 'Rechazar' }).click();
    await page.getByLabel('Otro', { exact: true }).check();
    await page.getByRole('button', { name: 'Confirmar rechazo' }).click();
    await expect(page.locator('p[role=alert]')).toContainText(
      'acaba de decidir',
    );
  });

  test('salir cierra la sesión y vuelve a pedir el correo', async ({
    page,
    sent,
  }) => {
    await page.goto('/es/moderation');
    await page.getByRole('button', { name: 'Salir' }).click();
    await expect(page.getByLabel('Tu correo')).toBeVisible();
    expect(sent.map((s) => s.path)).toEqual(['/auth/logout']);
  });

  test('en escritorio lista y detalle se ven a la vez', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/es/moderation');
    await expect(page.getByText('Elige una solicitud')).toBeVisible();
    await page.getByRole('button', { name: /Cocina del Pilar/ }).click();
    await expect(
      page.getByRole('button', { name: 'Pendientes (7)' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Cocina del Pilar' }),
    ).toBeVisible();
  });

  test('existe en inglés', async ({ page }) => {
    await page.goto('/en/moderation');
    await expect(
      page.getByRole('heading', { name: 'Moderation' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Pending (7)' }),
    ).toBeVisible();
  });
});

test('un moderador ve lo de equipo y retiradas pero no lo decide', async ({
  page,
  session,
}) => {
  session.role = 'moderator';
  await page.goto('/es/moderation');
  await page.getByRole('button', { name: /Retirada.*La Masa Madre/s }).click();
  await expect(page.getByText(/la decide un administrador/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retirar ahora' })).toHaveCount(
    0,
  );
});

test('la moderación no está en el menú público', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/es');
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await expect(
    page.getByRole('dialog').getByRole('link', { name: /Moderar/ }),
  ).toHaveCount(0);
});

test('en 320 px la entrada y la cola no se desbordan', async ({
  page,
  session,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  const overflow = () =>
    page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
  await page.goto('/es/moderation');
  await expect(page.getByLabel('Tu correo')).toBeVisible();
  expect(await overflow()).toBeLessThanOrEqual(0);

  session.role = 'admin';
  await page.goto('/es/moderation');
  await page.getByRole('button', { name: /Cocina del Pilar/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Cocina del Pilar' }),
  ).toBeVisible();
  expect(await overflow()).toBeLessThanOrEqual(0);
});

test('en 320 px el horario de una corrección cabe, también con letra ancha', async ({
  page,
  session,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  session.role = 'admin';
  await page.goto('/es/moderation');
  await page
    .getByRole('button', { name: /Corrección.*Café Paso a Paso/s })
    .click();
  await page.addStyleTag({ content: '* { font-family: Verdana !important; }' });
  await page.getByLabel('Cambiar el horario').check();
  await expect(page.getByRole('group', { name: 'domingo' })).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(0);
});

test('en 320 px las fotos de una solicitud caben, también con letra ancha', async ({
  page,
  session,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  session.role = 'admin';
  await page.goto('/es/moderation');
  await page.getByRole('button', { name: /Casa Marta/ }).click();
  await page.addStyleTag({ content: '* { font-family: Verdana !important; }' });
  await expect(
    page.getByRole('heading', { name: 'Fotos enviadas' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(0);
});
