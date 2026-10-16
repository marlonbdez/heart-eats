import { createHmac, timingSafeEqual } from 'node:crypto';

// Enlace de «Info pedida» para quien propuso (ADR 0007). No es una sesión: solo
// identifica una solicitud, caduca con el plazo y el `nonce` guardado en la
// solicitud lo invalida al usarlo o al cerrarla.
export const REPLY_DAYS = 30;
// Margen de cortesía: el enlace sigue valiendo unos días después del plazo que
// se dice en el correo, y hasta entonces no se cierra la solicitud.
export const REPLY_GRACE_DAYS = 3;

const DAY = 24 * 60 * 60_000;
export const replyDeadline = (from: Date) =>
  new Date(from.getTime() + REPLY_DAYS * DAY);
export const replyCutoff = (deadline: Date) =>
  new Date(deadline.getTime() + REPLY_GRACE_DAYS * DAY);

export interface ReplyClaims {
  suggestionId: string;
  expiresAt: Date;
  nonce: string;
}

const sign = (secret: string, payload: string) =>
  createHmac('sha256', secret).update(payload).digest('base64url');

export function signReplyToken(secret: string, claims: ReplyClaims): string {
  const payload = Buffer.from(
    `${claims.suggestionId}.${Math.floor(claims.expiresAt.getTime() / 1000)}.${claims.nonce}`,
  ).toString('base64url');
  return `${payload}.${sign(secret, payload)}`;
}

// `null` si la firma no cuadra, la forma es otra o ya caducó.
export function verifyReplyToken(
  secret: string,
  token: string,
  now = new Date(),
): ReplyClaims | null {
  const [payload, signature, ...rest] = token.split('.');
  if (!payload || !signature || rest.length > 0) return null;

  const expected = Buffer.from(sign(secret, payload));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }

  const [suggestionId, seconds, nonce] = Buffer.from(payload, 'base64url')
    .toString()
    .split('.');
  const expiresAt = new Date(Number(seconds) * 1000);
  if (!suggestionId || !nonce || !(expiresAt > now)) return null;
  return { suggestionId, expiresAt, nonce };
}
