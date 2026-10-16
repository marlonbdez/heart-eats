import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config/env.js';

describe('loadConfig', () => {
  it('usa valores por defecto para desarrollo local', () => {
    expect(loadConfig({})).toEqual({
      NODE_ENV: 'development',
      PORT: 3001,
      CORS_ORIGINS: ['http://localhost:3000'],
      MONGODB_URI: 'mongodb://127.0.0.1:27017/hearteats',
      TRUST_PROXY: 0,
      SUBMISSIONS_PER_HOUR: 30,
      SUBMISSIONS_PER_DAY: 200,
      KNOWN_CHAINS: [],
      WEB_URL: 'http://localhost:3000',
      NOMINATIM_URL: 'https://nominatim.openstreetmap.org',
      GEOCODER_USER_AGENT:
        'HeartEats (+https://hearteats.org; contact@hearteats.org)',
      MAIL_FROM: 'HeartEats <acceso@mail.hearteats.org>',
      MAIL_REPLY_TO: 'contact@hearteats.org',
    });
  });

  it('lee el geocodificador y quita la barra final de la dirección', () => {
    const config = loadConfig({
      NOMINATIM_URL: 'https://nominatim.example.org/',
      GEOCODER_USER_AGENT: 'HeartEats test (contact@hearteats.org)',
    });
    expect(config.NOMINATIM_URL).toBe('https://nominatim.example.org');
    expect(() => loadConfig({ NOMINATIM_URL: 'no-es-una-url' })).toThrow(
      /NOMINATIM_URL/,
    );
  });

  it('lee el administrador, la web y el correo, y normaliza lo que toca', () => {
    const config = loadConfig({
      ADMIN_EMAIL: 'Admin@Example.org',
      WEB_URL: 'https://hearteats.org/',
      RESEND_API_KEY: 're_clave',
    });
    expect(config).toMatchObject({
      ADMIN_EMAIL: 'admin@example.org',
      WEB_URL: 'https://hearteats.org',
      RESEND_API_KEY: 're_clave',
    });
    expect(() => loadConfig({ ADMIN_EMAIL: 'no-es-un-correo' })).toThrow(
      /ADMIN_EMAIL/,
    );
  });

  it('una variable vacía cuenta como no puesta', () => {
    const config = loadConfig({ ADMIN_EMAIL: '', RESEND_API_KEY: '' });
    expect(config.ADMIN_EMAIL).toBeUndefined();
    expect(config.RESEND_API_KEY).toBeUndefined();
  });

  it('en producción exige la clave del correo', () => {
    const production = {
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb+srv://usuario:clave@cluster.example.net/hearteats',
    };
    expect(() => loadConfig(production)).toThrow(/RESEND_API_KEY/);
    expect(() =>
      loadConfig({ ...production, RESEND_API_KEY: 're_clave' }),
    ).not.toThrow();
  });

  it('lee el límite de envíos y la confianza en el proxy', () => {
    const config = loadConfig({
      TRUST_PROXY: '1',
      SUBMISSIONS_PER_HOUR: '3',
      SUBMISSIONS_PER_DAY: '10',
    });
    expect(config).toMatchObject({
      TRUST_PROXY: 1,
      SUBMISSIONS_PER_HOUR: 3,
      SUBMISSIONS_PER_DAY: 10,
    });
    expect(() => loadConfig({ SUBMISSIONS_PER_HOUR: '-1' })).toThrow(
      /SUBMISSIONS_PER_HOUR/,
    );
    // 0 desactiva el tope (desarrollo local).
    expect(loadConfig({ SUBMISSIONS_PER_HOUR: '0' }).SUBMISSIONS_PER_HOUR).toBe(
      0,
    );
  });

  it('normaliza la lista de cadenas: sin acentos, mayúsculas ni vacíos', () => {
    expect(
      loadConfig({ KNOWN_CHAINS: ' Gran  Cadena, Café Central ,, ' })
        .KNOWN_CHAINS,
    ).toEqual(['gran cadena', 'cafe central']);
  });

  it('en producción exige la cadena de MongoDB', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/MONGODB_URI/);
    const config = loadConfig({
      NODE_ENV: 'production',
      RESEND_API_KEY: 're_clave',
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
      RESEND_API_KEY: 're_clave',
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
