import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { errorHandler } from '../src/middleware/errors.js';
import { parseOrThrow } from '../src/validation.js';

const schema = z.object({ name: z.string().min(2), age: z.number().int() });

const app = express();
app.use(express.json());
app.post('/probe', (req, res) => {
  res.json(parseOrThrow(schema, req.body));
});
app.get('/boom', () => {
  throw new Error('fallo inesperado con datos internos');
});
app.use(errorHandler);

describe('parseOrThrow', () => {
  it('devuelve los datos si cumplen el esquema', async () => {
    const res = await request(app).post('/probe').send({ name: 'Ana', age: 3 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ name: 'Ana', age: 3 });
  });

  it('da 422 con los campos que fallan y sin devolver los valores', async () => {
    const res = await request(app)
      .post('/probe')
      .send({ name: 'x', age: 'secreto' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('validation_failed');
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toEqual(
      ['name', 'age'],
    );
    expect(JSON.stringify(res.body)).not.toContain('secreto');
  });
});

describe('errorHandler', () => {
  it('un error inesperado da 500 sin filtrar su mensaje', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('internal_error');
    expect(JSON.stringify(res.body)).not.toContain('datos internos');
    expect(log).toHaveBeenCalledOnce();
    log.mockRestore();
  });
});
