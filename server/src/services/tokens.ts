import { createHash, randomBytes } from 'node:crypto';

// 32 bytes aleatorios (256 bits): imposibles de adivinar. En base64url para
// que viajen en un enlace o una cookie sin escapes.
export const newToken = () => randomBytes(32).toString('base64url');

// En la base de datos solo vive el hash. Como el token ya es aleatorio y largo,
// un SHA-256 sin sal basta: no hay diccionario que atacar.
export const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');
