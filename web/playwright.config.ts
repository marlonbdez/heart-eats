import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

// La prueba de humo se ejecuta contra la web exportada (`out/`), tal como se
// publica en Netlify. Hay que ejecutar `npm run build` antes.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    ...devices['Pixel 7'],
    launchOptions: {
      // WebGL por software, para que MapLibre funcione sin GPU.
      args: [
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--ignore-gpu-blocklist',
      ],
      // Opcional: usar un Chromium ya instalado en vez del de Playwright.
      executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    },
  },
  webServer: {
    command: `npx serve out -l ${PORT} --no-clipboard`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
