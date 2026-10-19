import { afterEach, describe, expect, it, vi } from 'vitest';
import { r2PhotoStore } from '../src/services/photo-store.js';

const options = {
  accountId: 'cuenta',
  accessKeyId: 'clave',
  secretAccessKey: 'secreto',
  bucket: 'fotos',
};

const fetchMock = vi.fn<typeof fetch>();
afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

function stubFetch(status = 200, body: string | null = null) {
  fetchMock.mockResolvedValue(new Response(body, { status }));
  vi.stubGlobal('fetch', fetchMock);
}

const sent = () => {
  const request = new Request(...(fetchMock.mock.calls[0] as [Request]));
  return request;
};

describe('r2PhotoStore', () => {
  it('sube la foto firmada al bucket', async () => {
    stubFetch();
    await r2PhotoStore(options).put(
      'q/uno.webp',
      new Uint8Array([1, 2, 3]),
      'image/webp',
    );

    const request = sent();
    expect(request.method).toBe('PUT');
    expect(request.url).toBe(
      'https://cuenta.r2.cloudflarestorage.com/fotos/q/uno.webp',
    );
    expect(request.headers.get('content-type')).toBe('image/webp');
    expect(request.headers.get('authorization')).toMatch(/^AWS4-HMAC-SHA256/);
  });

  it('usa la dirección de la UE si el bucket se creó allí', async () => {
    stubFetch();
    await r2PhotoStore({ ...options, jurisdiction: 'eu' }).remove('q/uno.webp');

    const request = sent();
    expect(request.method).toBe('DELETE');
    expect(request.url).toBe(
      'https://cuenta.eu.r2.cloudflarestorage.com/fotos/q/uno.webp',
    );
  });

  it('copia una foto dentro del bucket sin descargarla', async () => {
    stubFetch();
    await r2PhotoStore(options).copy('q/uno.webp', 'p/uno.webp');

    const request = sent();
    expect(request.method).toBe('PUT');
    expect(request.url).toBe(
      'https://cuenta.r2.cloudflarestorage.com/fotos/p/uno.webp',
    );
    expect(request.headers.get('x-amz-copy-source')).toBe('/fotos/q/uno.webp');
  });

  it('lee una foto y devuelve su tipo', async () => {
    fetchMock.mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        headers: { 'Content-Type': 'image/webp' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const photo = await r2PhotoStore(options).get('p/uno.webp');
    expect(photo).toEqual({
      body: Buffer.from([1, 2, 3]),
      contentType: 'image/webp',
    });
    expect(sent().method).toBe('GET');
  });

  it('si la foto no está, get devuelve null', async () => {
    stubFetch(404);
    expect(await r2PhotoStore(options).get('p/nada.webp')).toBeNull();
  });

  it('si leer falla por otro motivo, get da error', async () => {
    stubFetch(500);
    await expect(r2PhotoStore(options).get('p/uno.webp')).rejects.toThrow(
      'R2 respondió 500 a GET',
    );
  });

  it('falla con el código de R2 y sin más detalles', async () => {
    stubFetch(403);
    await expect(
      r2PhotoStore(options).put(
        'q/uno.webp',
        new Uint8Array([1]),
        'image/webp',
      ),
    ).rejects.toThrow('R2 respondió 403 a PUT');
  });

  it('añade el código de error que da R2, sin el resto de la respuesta', async () => {
    stubFetch(
      403,
      '<Error><Code>AccessDenied</Code><Message>Bucket fotos secreto</Message></Error>',
    );
    const error = await r2PhotoStore(options)
      .put('q/uno.webp', new Uint8Array([1]), 'image/webp')
      .catch((err: Error) => err);
    expect((error as Error).message).toBe(
      'R2 respondió 403 (AccessDenied) a PUT',
    );
    expect((error as Error).message).not.toContain('fotos');
  });
});
