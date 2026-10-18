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

function stubFetch(status = 200) {
  fetchMock.mockResolvedValue(new Response(null, { status }));
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
});
