import { Router } from 'express';
import { ApiError } from '../errors.js';
import { authOf, requireSession, toAuthUser } from '../middleware/session.js';
import { AuditLog } from '../models/audit-log.js';
import { LoginToken } from '../models/login-token.js';
import { Session } from '../models/session.js';
import { User, moderationRoles, type UserRecord } from '../models/user.js';
import { inviteSchema } from '../services/user-input.js';
import { objectIdPattern } from '../services/suggestion-query.js';
import { parseOrThrow } from '../validation.js';

// Los equipos de moderación son pequeños: la lista cabe entera.
const MAX_USERS = 200;

const toItem = (user: UserRecord) => ({
  id: String(user._id),
  email: user.email,
  role: user.role,
  moderationScope: toAuthUser(user).moderationScope,
  createdAt: user.createdAt.toISOString(),
  ...(user.disabledAt ? { disabledAt: user.disabledAt.toISOString() } : {}),
});

const notFound = () => new ApiError(404, 'not_found', 'No existe esa persona');

export function usersRouter({
  allowedOrigins,
}: {
  allowedOrigins: readonly string[];
}) {
  const router = Router();

  // Todo lo de aquí es de administración (ADR 0008) y lleva correos.
  router.use('/users', ...requireSession(allowedOrigins), (_req, res, next) => {
    if (authOf(res).role !== 'admin') {
      throw new ApiError(
        403,
        'forbidden',
        'Los usuarios los gestiona un administrador',
      );
    }
    res.set('Cache-Control', 'no-store');
    next();
  });

  router.get('/users', async (_req, res) => {
    const users = await User.find({ role: { $in: moderationRoles } })
      .sort({ createdAt: 1, _id: 1 })
      .limit(MAX_USERS)
      .lean<UserRecord[]>();
    res.json({ items: users.map(toItem) });
  });

  // Alta por invitación: no se envía nada. La persona entra con su correo y el
  // enlace mágico (ADR 0007), como cualquier moderador. Si ya estuvo de baja,
  // se repone con el ámbito nuevo.
  router.post('/users', async (req, res) => {
    const { email, moderationScope } = parseOrThrow(inviteSchema, req.body);
    const actor = authOf(res);
    const taken = () =>
      new ApiError(409, 'already_exists', 'Esa persona ya tiene acceso');

    const existing = await User.findOne({ email }).lean<UserRecord>();
    let user: UserRecord;
    if (!existing) {
      try {
        user = (
          await User.create({
            email,
            role: 'moderator',
            moderationScope,
          })
        ).toObject() as UserRecord;
      } catch (err) {
        // Dos altas a la vez con el mismo correo.
        if ((err as { code?: number }).code === 11000) throw taken();
        throw err;
      }
    } else {
      if (existing.role !== 'moderator' || !existing.disabledAt) throw taken();
      user = (await User.findOneAndUpdate(
        { _id: existing._id, disabledAt: { $exists: true } },
        { $set: { moderationScope }, $unset: { disabledAt: '' } },
        { returnDocument: 'after' },
      ).lean<UserRecord>())!;
      if (!user) throw taken();
    }

    // Sin el correo: ya consta en el usuario, y el registro no repite datos
    // personales.
    await AuditLog.create({
      entity: 'user',
      entityId: user._id,
      action: existing ? 'reinstate' : 'invite',
      actorId: actor.id,
      diff: { role: user.role, moderationScope },
    });
    res.status(201).json(toItem(user));
  });

  // Baja: la persona sigue en el registro pero ya no entra. Sus sesiones y
  // enlaces sin usar se cierran al momento. Idempotente.
  router.delete('/users/:id', async (req, res) => {
    const id = String(req.params.id);
    if (!objectIdPattern.test(id)) throw notFound();
    const user = await User.findOne({
      _id: id,
      role: { $in: moderationRoles },
    }).lean<UserRecord>();
    if (!user) throw notFound();
    if (user.role === 'admin') {
      throw new ApiError(
        409,
        'cannot_remove_admin',
        'Un administrador no se da de baja desde aquí',
      );
    }

    if (!user.disabledAt) {
      const claimed = await User.updateOne(
        { _id: user._id, disabledAt: { $exists: false } },
        { $set: { disabledAt: new Date() } },
      );
      if (claimed.modifiedCount === 1) {
        await Promise.all([
          Session.deleteMany({ userId: user._id }),
          LoginToken.deleteMany({ userId: user._id }),
        ]);
        await AuditLog.create({
          entity: 'user',
          entityId: user._id,
          action: 'disable',
          actorId: authOf(res).id,
        });
      }
    }
    res.status(204).end();
  });

  return router;
}
