import { Session } from '../../src/models/session.js';
import { User, type ModerationScope } from '../../src/models/user.js';
import { hashToken, newToken } from '../../src/services/tokens.js';

interface TestUser {
  email?: string;
  role?: 'moderator' | 'admin';
  moderationScope?: ModerationScope[];
}

// Crea un usuario con sesión abierta y devuelve la cabecera `Cookie`, sin
// pasar por el enlace del correo (eso lo prueba auth.int.test.ts).
export async function signedInCookie({
  email = 'ana@example.org',
  role = 'moderator',
  moderationScope = [{ country: 'ES', city: 'Madrid' }],
}: TestUser = {}) {
  const user = await User.create({ email, role, moderationScope });
  const token = newToken();
  await Session.create({ userId: user._id, tokenHash: hashToken(token) });
  return `he_session=${token}`;
}
