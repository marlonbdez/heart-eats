import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // La primera vez, las pruebas con base de datos descargan MongoDB.
    hookTimeout: 120_000,
    testTimeout: 30_000,
  },
});
