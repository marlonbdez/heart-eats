import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config/env.js';

describe('loadConfig', () => {
  it('usa valores por defecto para desarrollo local', () => {
    expect(loadConfig({})).toEqual({
      NODE_ENV: 'development',
      PORT: 3001,
      CORS_ORIGINS: ['http://localhost:3000'],
    });
  });

  it('lee el puerto y separa los orígenes por comas', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      PORT: '10000',
      CORS_ORIGINS: 'https://hearteats.org, https://www.hearteats.org',
    });
    expect(config.PORT).toBe(10000);
    expect(config.CORS_ORIGINS).toEqual([
      'https://hearteats.org',
      'https://www.hearteats.org',
    ]);
  });

  it('no arranca con un puerto no válido y dice cuál', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/PORT/);
  });

  it('no arranca con un origen que no es una URL', () => {
    expect(() => loadConfig({ CORS_ORIGINS: 'hearteats.org' })).toThrow(
      /CORS_ORIGINS/,
    );
  });
});
