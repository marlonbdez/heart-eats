import { AwsClient } from 'aws4fetch';

// Dónde viven las fotos. Hoy es un bucket privado de R2: nada se sirve directo
// desde allí.
export interface PhotoStore {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
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
  });
  const host = jurisdiction
    ? `${accountId}.${jurisdiction}.r2.cloudflarestorage.com`
    : `${accountId}.r2.cloudflarestorage.com`;

  async function send(method: string, key: string, init: RequestInit = {}) {
    const res = await client.fetch(`https://${host}/${bucket}/${key}`, {
      ...init,
      method,
    });
    // Solo el código: el cuerpo de R2 puede nombrar el bucket.
    if (!res.ok) throw new Error(`R2 respondió ${res.status} a ${method}`);
  }

  return {
    put: (key, body, contentType) =>
      send('PUT', key, { body, headers: { 'Content-Type': contentType } }),
    remove: (key) => send('DELETE', key),
  };
}
