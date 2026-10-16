import { describe, expect, it, vi } from 'vitest';
import { sameOriginWrites } from '../src/middleware/session.js';
import { User } from '../src/models/user.js';
import { sessionRequestSchema } from '../src/services/auth-input.js';
import { readCookie } from '../src/services/cookies.js';
import { resendMailer } from '../src/services/mailer.js';
import { hashToken, newToken } from '../src/services/tokens.js';

describe('tokens', () => {
  it('son largos, distintos cada vez y con la forma que acepta la ruta', () => {
    const a = newToken();
    expect(a).not.toBe(newToken());
    expect(sessionRequestSchema.safeParse({ token: a }).success).toBe(true);
  });

  it('el hash es estable y no revela el token', () => {
    const token = newToken();
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).not.toContain(token);
  });

  it('la ruta rechaza tokens con otra forma', () => {
    for (const token of ['', 'corto', `${newToken()}x`, { $ne: 1 }, 7]) {
      expect(sessionRequestSchema.safeParse({ token }).success).toBe(false);
    }
  });
});

describe('readCookie', () => {
  it('encuentra la cookie entre otras', () => {
    expect(readCookie('a=1; he_session=abc; b=2', 'he_session')).toBe('abc');
  });
  it('devuelve undefined si no está', () => {
    expect(readCookie('a=1', 'he_session')).toBeUndefined();
    expect(readCookie(undefined, 'he_session')).toBeUndefined();
  });
});

describe('sameOriginWrites', () => {
  const guard = sameOriginWrites(['https://hearteats.org']);
  const run = (method: string, headers: Record<string, string>) => {
    const next = vi.fn();
    const req = {
      method,
      get: (name: string) => headers[name.toLowerCase()],
    };
    guard(req as never, {} as never, next);
    return next.mock.calls[0]?.[0] as { status?: number } | undefined;
  };

  it('deja pasar las lecturas', () => {
    expect(run('GET', {})).toBeUndefined();
  });
  it('en las escrituras exige el origen de la web y la cabecera propia', () => {
    const ok = {
      origin: 'https://hearteats.org',
      'x-requested-with': 'fetch',
    };
    expect(run('POST', ok)).toBeUndefined();
    expect(run('POST', {})?.status).toBe(403);
    expect(run('POST', { ...ok, origin: 'https://otro.example' })?.status).toBe(
      403,
    );
    expect(run('POST', { origin: ok.origin })?.status).toBe(403);
  });
});

describe('User', () => {
  const user = (over: Record<string, unknown> = {}) =>
    new User({ email: 'Ana@Example.org', role: 'admin', ...over }).validate();

  it('acepta un usuario válido y normaliza el correo', async () => {
    const doc = new User({
      email: ' Ana@Example.org ',
      role: 'moderator',
      moderationScope: [{ country: 'es', city: 'Madrid' }],
    });
    await expect(doc.validate()).resolves.toBeUndefined();
    expect(doc.email).toBe('ana@example.org');
    expect(doc.moderationScope[0]?.country).toBe('ES');
  });

  it('rechaza un rol o un país no válidos', async () => {
    await expect(user({ role: 'owner' })).rejects.toThrow(/role/);
    await expect(
      user({ moderationScope: [{ country: 'España' }] }),
    ).rejects.toThrow(/country/);
  });
});

describe('resendMailer', () => {
  const link = {
    to: 'ana@example.org',
    url: 'https://hearteats.org/es/moderation/login#token=abc',
    locale: 'es',
  } as const;

  it('envía el enlace por la API con la respuesta al correo del dominio', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    await resendMailer({
      apiKey: 're_clave',
      from: 'HeartEats <acceso@mail.hearteats.org>',
      replyTo: 'contact@hearteats.org',
      fetchFn,
    }).sendLoginLink(link);

    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer re_clave');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      to: ['ana@example.org'],
      reply_to: 'contact@hearteats.org',
    });
    expect(body.text).toContain(link.url);
  });

  it('usa el idioma pedido', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    await resendMailer({
      apiKey: 'k',
      from: 'a',
      replyTo: 'b@example.org',
      fetchFn,
    }).sendLoginLink({ ...link, locale: 'en' });
    expect(JSON.parse(fetchFn.mock.calls[0]![1].body).subject).toMatch(
      /sign-in/,
    );
  });

  it('avisa de la ficha publicada, en el idioma de quien propuso', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const mailer = resendMailer({
      apiKey: 'k',
      from: 'a',
      replyTo: 'b@example.org',
      fetchFn,
    });
    const approval = {
      to: 'ana@example.org',
      url: 'https://hearteats.org/es/place/casa-nueva-madrid',
      name: 'Casa Nueva',
      locale: 'es',
    } as const;
    await mailer.sendApproval(approval);
    await mailer.sendApproval({ ...approval, locale: 'en' });

    const [es, en] = fetchFn.mock.calls.map(([, init]) =>
      JSON.parse(init.body),
    );
    expect(es.subject).toMatch(/ya está en HeartEats/);
    expect(es.text).toContain(approval.url);
    expect(es.text).toContain('Casa Nueva');
    expect(en.subject).toMatch(/now on HeartEats/);
  });

  it('falla si el proveedor rechaza, sin repetir la dirección', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 422 });
    const mailer = resendMailer({
      apiKey: 'k',
      from: 'a',
      replyTo: 'b@example.org',
      fetchFn,
    });
    await expect(mailer.sendLoginLink(link)).rejects.toThrow('422');
    await expect(mailer.sendLoginLink(link)).rejects.not.toThrow(/example/);
  });
});
