import { Router } from 'express';
import { ApiError } from '../errors.js';
import {
  SESSION_COOKIE,
  requireSession,
  sameOriginWrites,
  authOf,
  toAuthUser,
  type AuthUser,
} from '../middleware/session.js';
import type { RateLimiter } from '../middleware/rate-limit.js';
import { AuditLog } from '../models/audit-log.js';
import { LoginToken } from '../models/login-token.js';
import { SESSION_IDLE_SECONDS, Session } from '../models/session.js';
import { User, moderationRoles } from '../models/user.js';
import {
  loginRequestSchema,
  sessionRequestSchema,
} from '../services/auth-input.js';
import { readCookie } from '../services/cookies.js';
import type { Mailer } from '../services/mailer.js';
import { hashToken, newToken } from '../services/tokens.js';
import { parseOrThrow } from '../validation.js';

const LINK_MINUTES = 15;
// Enlaces vivos que puede tener una misma persona a la vez: frena que alguien
// llene un buzón ajeno aunque cambie de IP.
const MAX_LIVE_LINKS = 5;

interface AuthOptions {
  limiter: RateLimiter;
  mailer: Mailer;
  // Base de los enlaces del correo (la web, no la API).
  webUrl: string;
  allowedOrigins: readonly string[];
  secureCookies: boolean;
}

const publicUser = ({ email, role, moderationScope }: AuthUser) => ({
  email,
  role,
  moderationScope,
});

export function authRouter({
  limiter,
  mailer,
  webUrl,
  allowedOrigins,
  secureCookies,
}: AuthOptions) {
  const router = Router();

  // Respuestas con credenciales: que nada las guarde en caché.
  router.use('/auth', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  // Responde siempre igual, exista el usuario o no, para no revelar quién
  // modera (ADR 0007).
  router.post('/auth/magic-link', limiter.check, async (req, res) => {
    const { email, locale } = parseOrThrow(loginRequestSchema, req.body);
    limiter.hit(req);

    const user = await User.findOne({
      email,
      role: { $in: moderationRoles },
      disabledAt: { $exists: false },
    }).lean();
    if (user) {
      const live = await LoginToken.countDocuments({
        userId: user._id,
        usedAt: { $exists: false },
        expiresAt: { $gt: new Date() },
      });
      if (live < MAX_LIVE_LINKS) {
        const token = newToken();
        await LoginToken.create({
          userId: user._id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + LINK_MINUTES * 60_000),
        });
        // Sin esperar al proveedor: así la respuesta tarda lo mismo con o
        // sin usuario. Un fallo se anota sin la dirección.
        void mailer
          .sendLoginLink({
            to: email,
            url: `${webUrl}/${locale}/moderation/login#token=${token}`,
            locale,
          })
          .catch((err: unknown) => {
            console.error(
              'No se pudo enviar el enlace de acceso:',
              err instanceof Error ? err.message : err,
            );
          });
      }
    }
    res.status(202).json({ status: 'accepted' });
  });

  // Cambia el token del enlace por una sesión. El token solo sirve una vez:
  // se marca como usado en la misma operación que lo busca.
  router.post('/auth/session', async (req, res) => {
    const { token } = parseOrThrow(sessionRequestSchema, req.body);
    const invalid = () =>
      new ApiError(
        401,
        'invalid_token',
        'El enlace no es válido o ha caducado',
      );

    const link = await LoginToken.findOneAndUpdate(
      {
        tokenHash: hashToken(token),
        usedAt: { $exists: false },
        expiresAt: { $gt: new Date() },
      },
      { usedAt: new Date() },
    ).lean();
    if (!link) throw invalid();

    const user = await User.findOne({
      _id: link.userId,
      role: { $in: moderationRoles },
      disabledAt: { $exists: false },
    }).lean();
    if (!user) throw invalid();

    const sessionToken = newToken();
    await Session.create({
      userId: user._id,
      tokenHash: hashToken(sessionToken),
    });
    await AuditLog.create({
      entity: 'user',
      entityId: user._id,
      action: 'login',
      actorId: user._id,
    });

    res.cookie(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: secureCookies,
      sameSite: 'strict',
      maxAge: SESSION_IDLE_SECONDS * 1000,
      path: '/',
    });
    res.json(publicUser(toAuthUser(user)));
  });

  router.get('/auth/me', ...requireSession(allowedOrigins), (_req, res) => {
    res.json(publicUser(authOf(res)));
  });

  // Idempotente: cerrar una sesión que ya no existe también sale bien.
  router.post(
    '/auth/logout',
    sameOriginWrites(allowedOrigins),
    async (req, res) => {
      const token = readCookie(req.get('cookie'), SESSION_COOKIE);
      if (token) await Session.deleteOne({ tokenHash: hashToken(token) });
      res.clearCookie(SESSION_COOKIE, {
        httpOnly: true,
        secure: secureCookies,
        sameSite: 'strict',
        path: '/',
      });
      res.status(204).end();
    },
  );

  return router;
}
