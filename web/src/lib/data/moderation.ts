import { ApiRequestError, apiPost, sessionGet, sessionPost } from '../api';
import type {
  CorrectionKind,
  ModerationDecision,
  ModerationItem,
  ModerationKind,
  ModerationSession,
  ModerationStatus,
  ModerationWarning,
  RemovalWhat,
} from '../types';

// Lo que devuelve GET /suggestions (docs/02_API_SPEC.md): como `ModerationItem`
// pero con `type` en lugar de `kind` y la fecha en lugar de «hace N días».
interface ApiItem extends Omit<ModerationItem, 'kind' | 'daysAgo'> {
  type: 'new' | 'edit' | 'team' | 'removal';
  createdAt: string;
  correction?: { kind: CorrectionKind; before?: string; after: string };
  removal?: { what: RemovalWhat; details?: string };
  warnings: ModerationWarning[];
  status: ModerationStatus;
}

const DAY = 24 * 60 * 60_000;

const kinds: Record<ApiItem['type'], ModerationKind> = {
  new: 'new',
  edit: 'correction',
  team: 'team',
  removal: 'removal',
};

function toItem({ type, createdAt, ...rest }: ApiItem): ModerationItem {
  return {
    ...rest,
    kind: kinds[type],
    daysAgo: Math.max(
      0,
      Math.floor((Date.now() - Date.parse(createdAt)) / DAY),
    ),
  };
}

// Entrada con un enlace enviado al correo (ADR 0007). Responde igual exista
// o no esa persona: no se revela quién modera.
export async function requestLoginLink(email: string, locale: 'es' | 'en') {
  await apiPost('/auth/magic-link', { email, locale });
}

// Cambia el token del enlace por la sesión (la cookie la fija el servidor).
export async function startSession(token: string): Promise<ModerationSession> {
  return sessionPost<ModerationSession>('/auth/session', { token });
}

// Quién está dentro, o null si no hay sesión.
export async function getSession(): Promise<ModerationSession | null> {
  try {
    return await sessionGet<ModerationSession>('/auth/me');
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 401) return null;
    throw err;
  }
}

export async function endSession() {
  await sessionPost('/auth/logout');
}

const PAGE = 50;
// Tope de páginas por lista, por si el cursor no se cerrara nunca.
const MAX_PAGES = 20;

// Una lista de la cola. `waiting` son las que esperan respuesta de quien
// propuso; `resolved`, las aprobadas y rechazadas.
export async function getModerationQueue(
  status: 'pending' | 'info_requested' | 'resolved',
): Promise<ModerationItem[]> {
  const all: ApiItem[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await sessionGet<{ items: ApiItem[]; nextCursor?: string }>(
      '/suggestions',
      { status, limit: PAGE, cursor },
    );
    all.push(...res.items);
    if (!res.nextCursor) break;
    cursor = res.nextCursor;
  }
  return all.map(toItem);
}

// El detalle geocodifica la primera vez que se abre un local nuevo: trae el
// pin y los avisos de duplicado que la cola no tiene.
export async function getModerationItem(id: string): Promise<ModerationItem> {
  return toItem(await sessionGet<ApiItem>(`/suggestions/${id}`));
}

// El cuerpo de la decisión depende del tipo de solicitud (docs/02_API_SPEC.md).
function decisionBody(item: ModerationItem, d: ModerationDecision) {
  if (d.action !== 'approve') return d;
  if (item.kind === 'new') {
    return {
      action: 'approve',
      level: d.level,
      method: d.method,
      location: d.location,
      ownerConfirmed: true,
    };
  }
  if (item.kind === 'removal') {
    return {
      action: 'approve',
      identityConfirmed: true,
      storyIndex: d.storyIndex,
    };
  }
  if (item.kind === 'team') return { action: 'approve', ownerConfirmed: true };
  return { action: 'approve', ...d.change };
}

export async function decideModeration(
  item: ModerationItem,
  decision: ModerationDecision,
): Promise<void> {
  await sessionPost(
    `/suggestions/${item.id}/decision`,
    decisionBody(item, decision),
  );
}
