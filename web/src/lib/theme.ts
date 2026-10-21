// Tema de la web: «system» sigue al dispositivo (lo de siempre) y «light» o
// «dark» lo fija la persona desde el menú lateral. La elección se recuerda en
// este dispositivo (es una palabra, no sale de él) y se refleja en /cookies.
export type Theme = 'system' | 'light' | 'dark';

export const THEME_KEY = 'hearteats:theme';

export const THEMES: readonly Theme[] = ['system', 'light', 'dark'];

const isTheme = (value: string | null | undefined): value is Theme =>
  THEMES.includes(value as Theme);

// Se ejecuta en el <head>, antes de pintar, para que no haya un parpadeo con el
// tema equivocado. Si cambias algo aquí, cambia también `loadTheme`.
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export function loadTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    return isTheme(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

// Aplica el tema a la página y lo recuerda. «system» quita la marca y deja
// que mande el dispositivo.
export function saveTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
  try {
    if (theme === 'system') window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): el tema cambia, solo que
    // no se recuerda.
  }
}

// ¿Se está viendo en oscuro ahora mismo, por elección o por el dispositivo?
export function isDark(): boolean {
  const chosen = document.documentElement.dataset.theme;
  if (chosen) return chosen === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// Pasa al otro aspecto, de claro a oscuro y al revés, así que cada toque se ve.
// Si el aspecto al que se pasa es el del dispositivo, se vuelve a «system» (sigue
// al dispositivo y no se guarda nada).
export function toggleTheme() {
  const deviceDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const next: Theme = isDark() ? 'light' : 'dark';
  saveTheme((next === 'dark') === deviceDark ? 'system' : next);
}

// Avisa cuando cambia el tema, venga de la elección o del dispositivo. Devuelve
// la función que lo deja de escuchar.
export function watchTheme(onChange: () => void): () => void {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  media.addEventListener('change', onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener('change', onChange);
  };
}
