import { User } from '../models/user.js';

// Ámbito inicial del administrador (ADR 0008). Quien sea admin podrá ampliar
// el ámbito de los demás al invitarlos.
const INITIAL_SCOPE = [{ country: 'ES', city: 'Madrid' }];

// Da de alta (o repone) al primer administrador a partir de la configuración.
// Es idempotente y no toca el ámbito de un administrador que ya existe.
export async function ensureAdmin(email: string) {
  await User.updateOne(
    { email },
    {
      $set: { role: 'admin' },
      $unset: { disabledAt: '' },
      $setOnInsert: { moderationScope: INITIAL_SCOPE },
    },
    { upsert: true },
  );
}
