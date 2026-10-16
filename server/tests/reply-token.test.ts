import { describe, expect, it } from 'vitest';
import {
  signReplyToken,
  verifyReplyToken,
} from '../src/services/reply-token.js';

const secret = 's'.repeat(32);
const claims = {
  suggestionId: '66f000000000000000000001',
  expiresAt: new Date('2026-11-01T00:00:00Z'),
  nonce: 'abc123',
};
const before = new Date('2026-10-20T00:00:00Z');

describe('enlace de respuesta', () => {
  it('se firma y se lee igual', () => {
    const token = signReplyToken(secret, claims);
    expect(verifyReplyToken(secret, token, before)).toEqual(claims);
  });

  it('viaja en un enlace sin escapes', () => {
    expect(signReplyToken(secret, claims)).toMatch(/^[A-Za-z0-9_.-]+$/);
  });

  it('no vale con otro secreto', () => {
    const token = signReplyToken(secret, claims);
    expect(verifyReplyToken('t'.repeat(32), token, before)).toBeNull();
  });

  it('no vale si se toca el contenido', () => {
    const [payload, signature] = signReplyToken(secret, claims).split('.');
    const forged = Buffer.from(
      `66f000000000000000000002.${Math.floor(claims.expiresAt.getTime() / 1000)}.abc123`,
    ).toString('base64url');
    expect(
      verifyReplyToken(secret, `${forged}.${signature}`, before),
    ).toBeNull();
    expect(payload).not.toBe(forged);
  });

  it('caduca con el plazo', () => {
    const token = signReplyToken(secret, claims);
    expect(verifyReplyToken(secret, token, claims.expiresAt)).toBeNull();
  });

  it.each(['', 'a', 'a.b.c', '.', 'a.'])('rechaza «%s»', (token) => {
    expect(verifyReplyToken(secret, token, before)).toBeNull();
  });
});
