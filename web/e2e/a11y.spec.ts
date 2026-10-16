import AxeBuilder from '@axe-core/playwright';
import { API, expect, test } from './support/test';

// Revisión automática de accesibilidad (WCAG 2.2 AA) en todas las pantallas,
// en español e inglés, con tema claro y oscuro, en móvil. Una revisión
// automática no sustituye a las pruebas con personas usuarias, pero evita las
// regresiones fáciles: contraste, nombres de botones, etiquetas, encabezados…
const PAGES = [
  '',
  '/list',
  '/place/demo-la-masa-madre',
  '/place/demo-cafe-paso-a-paso',
  '/propose',
  '/correct/demo-la-masa-madre',
  '/business',
  '/removal',
  '/moderation',
  '/reply',
  '/about',
  '/verification',
  '/privacy',
  '/cookies',
  '/legal',
  '/contact',
];

test.use({ viewport: { width: 360, height: 780 } });

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectNoViolations(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page })
    .withTags(TAGS)
    // La atribución del mapa es de terceros y obligatoria: no se puede
    // cambiar su estilo.
    .exclude('.maplibregl-ctrl-attrib')
    .analyze();
  const report = results.violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help}\n` +
      v.nodes
        .slice(0, 3)
        .map((n) => `   ${n.target.join(' ')}\n   ${n.failureSummary}`)
        .join('\n'),
  );
  expect(report, report.join('\n\n')).toEqual([]);
}

for (const locale of ['es', 'en']) {
  for (const scheme of ['light', 'dark'] as const) {
    for (const path of PAGES) {
      test(`a11y ${locale} ${scheme} ${path || '/'}`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(`/${locale}${path}`);
        await page.locator('#contenido, main').first().waitFor();
        // Los datos llegan de la API: se revisa la pantalla ya cargada.
        await expect(page.getByText(/^(Cargando|Loading)…$/)).toHaveCount(0);
        await expectNoViolations(page);
      });
    }
  }
}

// Estados que solo existen tras interactuar.
for (const scheme of ['light', 'dark'] as const) {
  test.describe(`estados interactivos (${scheme})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
    });

    test('sin locales publicados', async ({ page }) => {
      await page.route(`${API}/restaurants?**`, (route) =>
        route.fulfill({
          headers: { 'access-control-allow-origin': '*' },
          json: { items: [] },
        }),
      );
      await page.goto('/es');
      await expect(
        page.getByRole('heading', { name: /Todavía no hay locales/ }),
      ).toBeVisible();
      await expectNoViolations(page);
    });

    test('error al cargar los datos', async ({ page }) => {
      await page.route(`${API}/restaurants?**`, (route) =>
        route.fulfill({ status: 503, body: '' }),
      );
      await page.goto('/es');
      await expect(
        page.getByRole('button', { name: 'Reintentar' }),
      ).toBeVisible();
      await expectNoViolations(page);
    });

    test('ficha que no existe', async ({ page }) => {
      await page.goto('/es/place/no-existe');
      await expect(
        page.getByRole('heading', { name: 'No encontramos este local' }),
      ).toBeVisible();
      await expectNoViolations(page);
    });

    test('menú lateral abierto', async ({ page }) => {
      await page.goto('/es');
      await page.getByRole('button', { name: /menú/i }).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expectNoViolations(page);
    });

    test('ficha emergente de un local en el mapa', async ({ page }) => {
      await page.goto('/es');
      await page.locator('[data-marker]').first().click();
      await expect(page.getByRole('complementary')).toBeVisible();
      await expectNoViolations(page);
    });

    test('formulario con errores de validación', async ({ page }) => {
      await page.goto('/es/propose');
      await page.getByRole('button', { name: 'Continuar' }).click();
      await expect(page.locator('p[role=alert]')).toBeVisible();
      await expectNoViolations(page);
    });

    test('proponer un local con el borrador recuperado', async ({ page }) => {
      await page.goto('/es/propose');
      await page.getByLabel('Nombre del local').fill('Local a medias');
      await expect
        .poll(() =>
          page.evaluate(() =>
            window.localStorage.getItem('hearteats:draft-propose'),
          ),
        )
        .toContain('Local a medias');
      await page.reload();
      await expect(page.getByRole('status')).toBeVisible();
      await expectNoViolations(page);
    });

    test('proponer un local: paso de platos', async ({ page }) => {
      await page.goto('/es/propose');
      await page.getByLabel('Nombre del local').fill('Local con platos');
      await page.getByRole('button', { name: 'Continuar' }).click();
      await expect(page.getByLabel('Nombre del plato')).toBeVisible();
      await expectNoViolations(page);
    });

    test('negocio: historia con nombre y aviso de permiso', async ({
      page,
    }) => {
      await page.goto('/es/business/demo-la-masa-madre');
      await page.getByRole('button', { name: 'Empezar' }).click();
      await page.getByLabel(/Historias con nombre/).check();
      await page.getByRole('button', { name: 'Continuar' }).click();
      await page.getByLabel('Personas en el equipo').fill('11');
      await page.getByLabel('De ellas, con discapacidad').fill('4');
      await page.getByRole('button', { name: 'Continuar' }).click();
      await expect(page.locator('p[role=alert]').first()).toBeVisible();
      await expectNoViolations(page);
    });

    test('negocio: aviso de demasiados envíos', async ({ page }) => {
      await page.route(`${API}/teams`, (route) =>
        route.fulfill({
          status: 429,
          headers: { 'access-control-allow-origin': '*' },
          json: { error: { code: 'rate_limited', message: 'Muchas' } },
        }),
      );
      await page.goto('/es/business/demo-la-masa-madre');
      await page.getByRole('button', { name: 'Empezar' }).click();
      await page.getByLabel(/Solo cifras/).check();
      await page.getByRole('button', { name: 'Continuar' }).click();
      await page.getByLabel('Personas en el equipo').fill('8');
      await page.getByLabel('De ellas, con discapacidad').fill('3');
      await page.getByRole('button', { name: 'Continuar' }).click();
      await page.getByLabel('Correo de contacto').fill('negocio@ejemplo.org');
      await page.getByLabel(/Soy responsable del negocio/).check();
      await page.getByRole('button', { name: 'Enviar a revisión' }).click();
      await expect(page.locator('p[role=alert]')).toBeVisible();
      await expectNoViolations(page);
    });

    test('petición de retirada con errores', async ({ page }) => {
      await page.goto('/es/removal');
      await page.getByRole('button', { name: 'Continuar' }).click();
      await expect(page.locator('p[role=alert]')).toBeVisible();
      await expectNoViolations(page);
    });

    test('moderación: sin sesión (entrada)', async ({ page }) => {
      await page.goto('/es/moderation');
      await expect(page.getByLabel('Tu correo')).toBeVisible();
      await expectNoViolations(page);
    });

    test('moderación: cola, detalle abierto y rechazo', async ({
      page,
      session,
    }) => {
      session.role = 'admin';
      await page.goto('/es/moderation');
      await expect(
        page.getByRole('button', { name: /Cocina del Pilar/ }),
      ).toBeVisible();
      await expectNoViolations(page);
      await page.getByRole('button', { name: /Cocina del Pilar/ }).click();
      await expectNoViolations(page);
      await page.getByRole('button', { name: 'Rechazar' }).click();
      await expectNoViolations(page);
    });

    test('moderación: corrección y retirada', async ({ page, session }) => {
      session.role = 'admin';
      await page.goto('/es/moderation');
      await page
        .getByRole('button', { name: /Corrección.*Café Paso a Paso/s })
        .click();
      await expectNoViolations(page);
      await page.getByLabel('Cambiar el horario').check();
      await expect(page.getByRole('group', { name: 'lunes' })).toBeVisible();
      await expectNoViolations(page);
      await page.getByRole('button', { name: 'Volver a la lista' }).click();
      await page
        .getByRole('button', { name: /Retirada.*La Masa Madre/s })
        .click();
      await expectNoViolations(page);
    });

    test('moderación: equipo con historias', async ({ page, session }) => {
      session.role = 'admin';
      await page.goto('/es/moderation');
      await page
        .getByRole('button', { name: /Equipo.*Café Paso a Paso/s })
        .click();
      await expect(
        page.getByText('Texto de ejemplo de una historia.'),
      ).toBeVisible();
      await expectNoViolations(page);
    });

    test('moderación: usuarios (alta con error y baja)', async ({
      page,
      session,
    }) => {
      session.role = 'admin';
      await page.goto('/es/moderation');
      await page.getByRole('button', { name: 'Usuarios' }).click();
      await expect(page.getByText('lucia@ejemplo.org')).toBeVisible();
      await expectNoViolations(page);
      await page.getByRole('button', { name: 'Dar de alta' }).click();
      await expect(page.locator('p[role=alert]')).toBeVisible();
      await expectNoViolations(page);
      await page
        .getByRole('button', { name: 'Dar de baja a lucia@ejemplo.org' })
        .click();
      await expectNoViolations(page);
    });

    test('moderación: registro', async ({ page, session }) => {
      session.role = 'admin';
      await page.goto('/es/moderation');
      await page.getByRole('button', { name: 'Registro' }).click();
      await expect(page.getByText('Alta de moderador')).toBeVisible();
      await expectNoViolations(page);
    });

    test('responder a Moderación: formulario, error y enviado', async ({
      page,
    }) => {
      await page.goto('/es/reply#token=good');
      await expect(page.getByLabel('Tu respuesta')).toBeVisible();
      await expectNoViolations(page);
      await page.getByRole('button', { name: 'Enviar respuesta' }).click();
      await expect(page.locator('p[role=alert]')).toBeVisible();
      await expectNoViolations(page);
      await page.getByLabel('Tu respuesta').fill('Sí, hay rampa.');
      await page.getByRole('button', { name: 'Enviar respuesta' }).click();
      await expect(
        page.getByRole('heading', { name: '¡Gracias por responder!' }),
      ).toBeVisible();
      await expectNoViolations(page);
    });

    test('«Cerca de mí» sin permiso de ubicación', async ({ page }) => {
      await page.goto('/es/list');
      await page.getByRole('button', { name: 'Cerca de mí' }).click();
      await expect(page.getByRole('status').first()).toBeVisible();
      await expectNoViolations(page);
    });
  });
}
