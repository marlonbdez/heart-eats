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

    test('proponer un local: paso de platos con foto y aviso de permiso', async ({
      page,
    }) => {
      await page.goto('/es/propose');
      await page.getByLabel('Nombre del local').fill('Local con foto');
      await page.getByRole('button', { name: 'Continuar' }).click();
      await page.locator('input[type=file]').setInputFiles({
        name: 'plato.png',
        mimeType: 'image/png',
        buffer: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          'base64',
        ),
      });
      await expect(
        page.getByRole('img', { name: /Foto del plato 1/ }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Continuar' }).click();
      await expect(page.locator('p[role=alert]')).toBeVisible();
      await expectNoViolations(page);
    });

    test('negocio: fotos de su local con aviso de permiso', async ({
      page,
    }) => {
      await page.goto('/es/business/demo-la-masa-madre');
      await page.getByRole('button', { name: 'Empezar' }).click();
      await page.getByLabel(/Solo cifras/).check();
      await page.getByRole('button', { name: 'Continuar' }).click();
      await page.getByLabel('Personas en el equipo').fill('8');
      await page.getByLabel('De ellas, con discapacidad').fill('3');
      await page.locator('input[type=file]').setInputFiles({
        name: 'local.png',
        mimeType: 'image/png',
        buffer: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          'base64',
        ),
      });
      await page.getByRole('button', { name: 'Continuar' }).click();
      await expect(page.locator('p[role=alert]')).toBeVisible();
      await expectNoViolations(page);
    });

    test('petición de retirada con errores', async ({ page }) => {
      await page.goto('/es/removal');
      await page.getByRole('button', { name: 'Continuar' }).click();
      await expect(page.locator('p[role=alert]')).toBeVisible();
      await expectNoViolations(page);
    });

    test('moderación: detalle abierto y rechazo', async ({ page }) => {
      await page.goto('/es/moderation');
      await page.getByRole('button', { name: /Cocina del Pilar/ }).click();
      await expectNoViolations(page);
      await page.getByRole('button', { name: 'Rechazar' }).click();
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
