import type { ModerationItem } from '../types';

// Buzón de prueba del prototipo: lo que se envía desde los formularios se
// guarda SOLO en este navegador (localStorage) para poder verlo en la pantalla
// de moderación. No sale del dispositivo. Desaparece cuando exista el servidor
// (POST /api/v1/...), que será quien alimente la cola.
//
// Privacidad: aquí nunca se guarda el correo entero ni nombres ni textos de
// historias del equipo, solo lo imprescindible para mostrar la solicitud.
const KEY = 'hearteats:demo-outbox';
const MAX = 20;
const DAY = 24 * 60 * 60 * 1000;

type Stored = Omit<ModerationItem, 'daysAgo'> & { createdAt: number };

function read(): Stored[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? (list as Stored[]) : [];
  } catch {
    return [];
  }
}

export function maskEmail(email?: string): string | undefined {
  const mail = email?.trim();
  if (!mail) return undefined;
  const [user, domain] = mail.split('@');
  if (!user || !domain) return undefined;
  return `${user[0]}***@${domain}`;
}

export function addToOutbox(item: Omit<ModerationItem, 'id' | 'daysAgo'>) {
  try {
    const entry: Stored = {
      ...item,
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now(),
    };
    window.localStorage.setItem(
      KEY,
      JSON.stringify([entry, ...read()].slice(0, MAX)),
    );
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): el envío simulado sigue
    // funcionando, solo que no aparece en moderación.
  }
}

export function readOutbox(): ModerationItem[] {
  return read().map(({ createdAt, ...item }) => ({
    ...item,
    daysAgo: Math.max(0, Math.floor((Date.now() - createdAt) / DAY)),
  }));
}

export function clearOutbox() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // nada que borrar
  }
}
