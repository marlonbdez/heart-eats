import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config/env.js';

describe('loadConfig', () => {
  it('usa valores por defecto para desarrollo local', () => {
    expect(loadConfig({})).toEqual({
      NODE_ENV: 'development',
      PORT: 3001,
      CORS_ORIGINS: ['http://localhost:3000'],
      MONGODB_URI: 'mongodb://127.0.0.1:27017/hearteats',
    });
  });

  it('en producción exige la cadena de MongoDB', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/MONGODB_URI/);
    const config = loadConfig({
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb+srv://usuario:clave@cluster.example.net/hearteats',
    });
    expect(config.MONGODB_URI).toContain('mongodb+srv://');
  });

  it('no admite una cadena que no sea de MongoDB', () => {
    expect(() => loadConfig({ MONGODB_URI: 'postgres://x' })).toThrow(
      /MONGODB_URI/,
    );
  });

  it('lee el puerto y separa los orígenes por comas', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      PORT: '10000',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/hearteats',
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
