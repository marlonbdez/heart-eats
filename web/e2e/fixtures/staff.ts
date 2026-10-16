// Quien modera y el registro, tal como los devuelven GET /users y GET /audit.
// Correos inventados.
const daysAgo = (n: number) =>
  new Date(Date.now() - n * 24 * 60 * 60_000).toISOString();

export interface ApiStaff {
  id: string;
  email: string;
  role: 'moderator' | 'admin';
  moderationScope: { country: string; city?: string }[];
  createdAt: string;
  disabledAt?: string;
}

export const staff: ApiStaff[] = [
  {
    id: 'u1',
    email: 'admin@ejemplo.org',
    role: 'admin',
    moderationScope: [{ country: 'ES', city: 'Madrid' }],
    createdAt: daysAgo(90),
  },
  {
    id: 'u2',
    email: 'lucia@ejemplo.org',
    role: 'moderator',
    moderationScope: [{ country: 'ES', city: 'Madrid' }],
    createdAt: daysAgo(30),
  },
  {
    id: 'u3',
    email: 'baja@ejemplo.org',
    role: 'moderator',
    moderationScope: [{ country: 'ES' }],
    createdAt: daysAgo(60),
    disabledAt: daysAgo(10),
  },
];

export interface ApiAuditLine {
  id: string;
  entity: 'restaurant' | 'team' | 'suggestion' | 'user';
  entityId: string;
  action: string;
  at: string;
  actor?: string;
  diff?: Record<string, unknown>;
}

// Cinco líneas, de la más reciente a la más antigua: la API las pagina de a
// tres en estas pruebas.
export const auditLines: ApiAuditLine[] = [
  {
    id: 'a1',
    entity: 'user',
    entityId: 'u2',
    action: 'invite',
    at: daysAgo(1),
    actor: 'admin@ejemplo.org',
    diff: { role: 'moderator' },
  },
  {
    id: 'a2',
    entity: 'suggestion',
    entityId: 's1',
    action: 'reject',
    at: daysAgo(2),
    actor: 'lucia@ejemplo.org',
    diff: { reason: 'duplicate' },
  },
  {
    id: 'a3',
    entity: 'suggestion',
    entityId: 's2',
    action: 'auto_close',
    at: daysAgo(3),
  },
  {
    id: 'a4',
    entity: 'restaurant',
    entityId: 'r1',
    action: 'approve',
    at: daysAgo(4),
    actor: 'admin@ejemplo.org',
  },
  {
    id: 'a5',
    entity: 'user',
    entityId: 'u1',
    action: 'login',
    at: daysAgo(5),
    actor: 'admin@ejemplo.org',
  },
];
