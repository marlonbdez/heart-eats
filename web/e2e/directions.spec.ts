import { expect, test } from './support/test';

const PLACE = '/es/place/demo-la-masa-madre';

const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36';
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1';
const DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36';

const link = (page: import('@playwright/test').Page) =>
  page.getByRole('link', { name: 'Cómo llegar' });

test.describe('en Android', () => {
  test.use({ userAgent: ANDROID });

  test('abre el selector de apps de mapas del sistema, con el nombre del local', async ({
    page,
  }) => {
    await page.goto(PLACE);
    await expect(link(page)).toHaveAttribute(
      'href',
      /^geo:0,0\?q=-?[\d.]+,-?[\d.]+\(%5BDEMO%5D%20La%20Masa%20Madre\)$/,
    );
    await expect(link(page)).not.toHaveAttribute('target', /.*/);
  });
});

test.describe('en iPhone', () => {
  test.use({ userAgent: IPHONE });

  test('abre Apple Maps con la ruta al local', async ({ page }) => {
    await page.goto(PLACE);
    await expect(link(page)).toHaveAttribute(
      'href',
      /^https:\/\/maps\.apple\.com\/\?daddr=-?[\d.]+,-?[\d.]+$/,
    );
  });
});

test.describe('en ordenador', () => {
  test.use({ userAgent: DESKTOP, hasTouch: false, isMobile: false });

  test('abre el mapa abierto en una pestaña nueva', async ({ page }) => {
    await page.goto(PLACE);
    await expect(link(page)).toHaveAttribute(
      'href',
      /^https:\/\/www\.openstreetmap\.org\/directions\?to=/,
    );
    await expect(link(page)).toHaveAttribute('target', '_blank');
    await expect(link(page)).toHaveAttribute('rel', /noopener/);
  });
});
