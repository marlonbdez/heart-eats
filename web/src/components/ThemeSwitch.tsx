'use client';

import { useTranslations } from 'next-intl';
import { useSyncExternalStore } from 'react';
import { saveTheme, THEMES, watchTheme, type Theme } from '@/lib/theme';
import styles from './ThemeSwitch.module.css';

// Lo que hay puesto en la página manda: es lo que dejó el script del <head>
// (la elección guardada) o nada, que es «sistema». El servidor siempre dibuja
// «sistema» y el navegador lo corrige al hidratar.
const current = (): Theme => {
  const chosen = document.documentElement.dataset.theme;
  return chosen === 'light' || chosen === 'dark' ? chosen : 'system';
};

// Claro, oscuro o el del dispositivo. Va en el menú lateral para no cargar la
// cabecera.
export function ThemeSwitch() {
  const t = useTranslations('menu.theme');
  const theme = useSyncExternalStore(
    watchTheme,
    current,
    () => 'system' as Theme,
  );
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{t('label')}</legend>
      <div className={styles.options}>
        {THEMES.map((option) => (
          <label key={option} className={styles.option}>
            <input
              type="radio"
              name="theme"
              className={styles.input}
              checked={theme === option}
              onChange={() => saveTheme(option)}
            />
            <span className={styles.text}>{t(option)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
