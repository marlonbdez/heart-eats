import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const app = createApp({ CORS_ORIGINS: ['https://hearteats.org'] });

describe('GET /api/v1/health', () => {
  it('responde ok sin tocar la base de datos', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('lleva cabeceras de seguridad y no delata el framework', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['cross-origin-resource-policy']).toBe('same-site');
  });
});

describe('errores', () => {
  it('una ruta inexistente da 404 con la estructura de la API', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'not_found', message: expect.any(String), details: [] },
    });
  });

  it('un JSON mal formado da 400 sin repetir lo recibido', async () => {
    const res = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{"roto":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_json');
    expect(JSON.stringify(res.body)).not.toContain('roto');
  });

  it('un cuerpo de más de 32 KB da 413', async () => {
    const res = await request(app)
      .post('/api/v1/health')
      .send({ texto: 'a'.repeat(40 * 1024) });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('payload_too_large');
  });
});

describe('CORS', () => {
  it('permite el origen de la web, con credenciales', async () => {
    const res = await request(app)
      .get('/api/v1/health')
      .set('Origin', 'https://hearteats.org');
    expect(res.headers['access-control-allow-origin']).toBe(
      'https://hearteats.org',
    );
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('no concede nada a otros orígenes', async () => {
    const res = await request(app)
      .get('/api/v1/health')
      .set('Origin', 'https://otro.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
