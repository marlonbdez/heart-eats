// Borrador de un formulario, guardado SOLO en este navegador (localStorage).
// Sirve para no perder lo escrito si se cierra la pestaña o se corta la
// conexión. No sale del dispositivo, caduca a los 30 días y se puede borrar.
// Quien lo use decide qué campos guarda: nunca los privados (correo).
const DAY = 24 * 60 * 60 * 1000;
const TTL = 30 * DAY;

interface Stored<T> {
  data: T;
  savedAt: number;
}

export function loadDraft<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Stored<T>;
    if (
      !stored ||
      typeof stored.savedAt !== 'number' ||
      Date.now() - stored.savedAt > TTL
    ) {
      window.localStorage.removeItem(key);
      return null;
    }
    return stored.data;
  } catch {
    return null;
  }
}

export function saveDraft<T>(key: string, data: T) {
  try {
    const stored: Stored<T> = { data, savedAt: Date.now() };
    window.localStorage.setItem(key, JSON.stringify(stored));
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): el formulario sigue
    // funcionando, solo que sin borrador.
  }
}

export function clearDraft(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // nada que borrar
  }
}
