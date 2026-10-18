import { expect, test } from './support/test';

test('privacidad y contacto en el móvil: se leen sin desplazarse de lado', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  for (const [path, title] of [
    ['/es/privacy', 'Privacidad y datos'],
    ['/es/contact', 'Contacto'],
    ['/es/cookies', 'Cookies y almacenamiento'],
    ['/es/legal', 'Aviso legal'],
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole('heading', { level: 1, name: title }),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
  }
});

test('contacto lleva a proponer un local', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/es/contact');
  await page
    .locator('#contenido')
    .getByRole('link', { name: 'Proponer un local' })
    .click();
  await expect(page).toHaveURL(/\/es\/propose$/);
});

test('en inglés', async ({ page }) => {
  await page.goto('/en/privacy');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Privacy and data' }),
  ).toBeVisible();
  await page.goto('/en/contact');
  await expect(
    page.getByRole('link', { name: 'Report a bug on GitHub' }),
  ).toHaveAttribute('href', 'https://github.com/marlonbdez/heart-eats/issues');
});

test('el correo de contacto aparece en Contacto y en Privacidad, en ES y EN', async ({
  page,
}) => {
  for (const path of [
    '/es/contact',
    '/es/privacy',
    '/en/contact',
    '/en/privacy',
  ]) {
    await page.goto(path);
    await expect(
      page
        .locator('#contenido')
        .locator('a[href="mailto:contact@hearteats.org"]'),
    ).toBeVisible();
  }
  // Ya no se promete una dirección «en preparación».
  await page.goto('/es/contact');
  await expect(page.getByText('Todavía la estamos preparando')).toHaveCount(0);
});

test('el menú lleva al aviso legal y a cookies y almacenamiento, en ES y EN', async ({
  page,
}) => {
  for (const [locale, menu, links] of [
    [
      'es',
      /menú/i,
      [
        ['Cookies y almacenamiento', 'cookies'],
        ['Aviso legal', 'legal'],
      ],
    ],
    [
      'en',
      /menu/i,
      [
        ['Cookies and storage', 'cookies'],
        ['Legal notice', 'legal'],
      ],
    ],
  ] as const) {
    for (const [name, path] of links) {
      await page.goto(`/${locale}`);
      await page.getByRole('button', { name: menu }).first().click();
      await page
        .getByRole('dialog')
        .getByRole('link', { name, exact: true })
        .click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/${path}$`));
      await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    }
  }
});

test('cookies y almacenamiento: dice qué cookie hay (solo moderación) y lista lo que se guarda', async ({
  page,
}) => {
  await page.goto('/es/cookies');
  await expect(page.getByText(/HeartEats no usa cookies/)).toBeVisible();
  await expect(page.getByText(/he_session/).first()).toBeVisible();
  await expect(
    page.getByText(/El borrador de «Proponer un local»/),
  ).toBeVisible();
  await expect(page.getByText(/Tu idioma: si lo cambias/)).toBeVisible();
});

test('la privacidad dice dónde se guardan los datos, en ES y EN', async ({
  page,
}) => {
  await page.goto('/es/privacy');
  await expect(
    page.getByText(/Railway \(Ámsterdam, Países Bajos\)/),
  ).toBeVisible();
  await expect(
    page.getByText(/MongoDB Atlas \(París, Francia\)/),
  ).toBeVisible();
  await expect(page.getByText(/se cifra antes de salir/)).toBeVisible();
  await expect(page.getByText(/Resend \(servidores en Irlanda/)).toBeVisible();
  await page.goto('/en/privacy');
  await expect(
    page.getByText(/Railway \(Amsterdam, Netherlands\)/),
  ).toBeVisible();
  await expect(page.getByText(/MongoDB Atlas \(Paris, France\)/)).toBeVisible();
  await expect(page.getByText(/encrypted before it leaves/)).toBeVisible();
  await expect(page.getByText(/Resend \(servers in Ireland/)).toBeVisible();
});
