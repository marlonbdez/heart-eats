import type { RequestHandler, Response } from 'express';
import { ApiError } from '../errors.js';
import { Session, SESSION_IDLE_SECONDS } from '../models/session.js';
import {
  User,
  moderationRoles,
  type ModerationScope,
  type UserRole,
} from '../models/user.js';
import { readCookie } from '../services/cookies.js';
import { hashToken } from '../services/tokens.js';

export const SESSION_COOKIE = 'he_session';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  moderationScope: ModerationScope[];
}

// Del documento de Mongo a datos planos (el ámbito sin ids ni nulos).
export const toAuthUser = (user: {
  _id: unknown;
  email: string;
  role: UserRole;
  moderationScope: { country: string; city?: string | null }[];
}): AuthUser => ({
  id: String(user._id),
  email: user.email,
  role: user.role,
  moderationScope: user.moderationScope.map(({ country, city }) =>
    city ? { country, city } : { country },
  ),
});

// Busca la sesión de la cookie y la renueva. `null` si no hay, caducó o el
// usuario ya no puede moderar (una baja corta el acceso al momento).
export async function findAuthUser(
  cookieHeader: string | undefined,
): Promise<AuthUser | null> {
  const token = readCookie(cookieHeader, SESSION_COOKIE);
  if (!token) return null;

  const now = Date.now();
  const session = await Session.findOneAndUpdate(
    {
      tokenHash: hashToken(token),
      lastSeenAt: { $gt: new Date(now - SESSION_IDLE_SECONDS * 1000) },
    },
    { lastSeenAt: new Date(now) },
  ).lean();
  if (!session) return null;

  const user = await User.findOne({
    _id: session.userId,
    role: { $in: moderationRoles },
    disabledAt: { $exists: false },
  }).lean();
  if (!user) return null;

  return toAuthUser(user);
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Defensa extra contra peticiones de otros sitios (ADR 0007), además de
// SameSite=Strict: en las escrituras con sesión, el `Origin` ha de ser la web
// y debe venir la cabecera propia, que un formulario ajeno no puede añadir.
export function sameOriginWrites(
  allowedOrigins: readonly string[],
): RequestHandler {
  return (req, _res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();
    const origin = req.get('origin');
    if (
      !origin ||
      !allowedOrigins.includes(origin) ||
      !req.get('x-requested-with')
    ) {
      return next(new ApiError(403, 'forbidden', 'Petición no permitida'));
    }
    next();
  };
}

// Deja al usuario en `res.locals`; léelo con `authOf`.
export function requireSession(
  allowedOrigins: readonly string[],
): RequestHandler[] {
  const guard = sameOriginWrites(allowedOrigins);
  const load: RequestHandler = async (req, res, next) => {
    const user = await findAuthUser(req.get('cookie'));
    if (!user) {
      throw new ApiError(401, 'unauthorized', 'Hay que iniciar sesión');
    }
    res.locals.auth = user;
    next();
  };
  return [guard, load];
}

export const authOf = (res: Response): AuthUser => res.locals.auth as AuthUser;
