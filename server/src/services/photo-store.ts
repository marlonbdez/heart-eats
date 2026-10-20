import { AwsClient } from 'aws4fetch';
import type { Config } from '../config/env.js';

export interface StoredPhoto {
  body: Buffer;
  contentType: string;
}

// Dónde viven las fotos. Hoy es un bucket privado de R2: nada se sirve directo
// desde allí.
export interface PhotoStore {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  // Sin la foto, `null`.
  get(key: string): Promise<StoredPhoto | null>;
  // Copia dentro del mismo almacén. Falla si el origen no existe.
  copy(from: string, to: string): Promise<void>;
  // Borrar una foto que ya no está es correcto (no da error).
  remove(key: string): Promise<void>;
}

interface R2Options {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  // Un bucket creado con jurisdicción UE tiene otra dirección.
  jurisdiction?: 'eu';
}

// R2 habla el protocolo de S3; basta con firmar cada petición.
export function r2PhotoStore({
  accountId,
  accessKeyId,
  secretAccessKey,
  bucket,
  jurisdiction,
}: R2Options): PhotoStore {
  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: 's3',
    region: 'auto',
    // Ante un fallo del servidor reintenta poco: hay una persona esperando.
    retries: 2,
  });
  const host = jurisdiction
    ? `${accountId}.${jurisdiction}.r2.cloudflarestorage.com`
    : `${accountId}.r2.cloudflarestorage.com`;

  const request = (method: string, key: string, init: RequestInit = {}) =>
    client.fetch(`https://${host}/${bucket}/${key}`, { ...init, method });

  // Solo el estado y el código de error de R2 (por ejemplo `AccessDenied`): el
  // resto del cuerpo puede nombrar el bucket.
  async function fail(res: Response, method: string) {
    const body = await res.text().catch(() => '');
    const code = /<Code>([A-Za-z]{1,64})<\/Code>/.exec(body)?.[1];
    return new Error(
      `R2 respondió ${res.status}${code ? ` (${code})` : ''} a ${method}`,
    );
  }

  async function send(method: string, key: string, init: RequestInit = {}) {
    const res = await request(method, key, init);
    if (!res.ok) throw await fail(res, method);
  }

  return {
    put: (key, body, contentType) =>
      send('PUT', key, { body, headers: { 'Content-Type': contentType } }),
    async get(key) {
      const res = await request('GET', key);
      if (res.status === 404) return null;
      if (!res.ok) throw await fail(res, 'GET');
      return {
        body: Buffer.from(await res.arrayBuffer()),
        contentType:
          res.headers.get('content-type') ?? 'application/octet-stream',
      };
    },
    copy: (from, to) =>
      send('PUT', to, {
        headers: { 'x-amz-copy-source': `/${bucket}/${from}` },
      }),
    remove: (key) => send('DELETE', key),
  };
}

// Sin las claves de R2 no hay dónde guardar fotos.
export function photoStoreFromConfig(config: Config): PhotoStore | undefined {
  const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_PHOTOS_BUCKET,
    R2_JURISDICTION,
  } = config;
  if (
    !R2_ACCOUNT_ID ||
    !R2_ACCESS_KEY_ID ||
    !R2_SECRET_ACCESS_KEY ||
    !R2_PHOTOS_BUCKET
  ) {
    return undefined;
  }
  return r2PhotoStore({
    accountId: R2_ACCOUNT_ID,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucket: R2_PHOTOS_BUCKET,
    jurisdiction: R2_JURISDICTION,
  });
}
