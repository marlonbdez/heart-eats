import { routing, type Locale } from '@/i18n/routing';

// Idioma que se recuerda entre visitas: solo si la persona lo elige con el
// selector de la cabecera. Es un código de dos letras (es, en), no sale del
// dispositivo y se refleja en /cookies.
export const LANGUAGE_KEY = 'hearteats:language';

// Quien no usa un idioma que tengamos ve la web en inglés.
export const FALLBACK_LOCALE: Locale = 'en';

const isLocale = (value: string | null | undefined): value is Locale =>
  !!value && (routing.locales as readonly string[]).includes(value);

// La elección guardada manda; si no, el primer idioma del navegador que
// tengamos (es-MX cuenta como es); si no, inglés.
export function pickLocale(
  stored: string | null,
  browserLanguages: readonly string[],
): Locale {
  if (isLocale(stored)) return stored;
  for (const tag of browserLanguages) {
    const primary = tag.toLowerCase().split('-')[0];
    if (isLocale(primary)) return primary;
  }
  return FALLBACK_LOCALE;
}

export function loadLanguage(): string | null {
  try {
    return window.localStorage.getItem(LANGUAGE_KEY);
  } catch {
    return null;
  }
}

export function saveLanguage(locale: Locale) {
  try {
    window.localStorage.setItem(LANGUAGE_KEY, locale);
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): el idioma sigue
    // cambiando, solo que no se recuerda.
  }
}
