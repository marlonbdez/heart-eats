'use client';

import { useTranslations } from 'next-intl';
import { useSyncExternalStore } from 'react';
import { saveTheme, THEMES, watchTheme, type Theme } from '@/lib/theme';
import { MoonIcon, SunIcon, SystemIcon } from './Icons';
import styles from './SettingSwitch.module.css';

const ICONS = { system: SystemIcon, light: SunIcon, dark: MoonIcon };

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
      <legend className={styles.legend}>
        <SunIcon />
        {t('label')}
      </legend>
      <div className={styles.options}>
        {THEMES.map((option) => {
          const Icon = ICONS[option];
          return (
            <label key={option} className={styles.option}>
              <input
                type="radio"
                name="theme"
                className={styles.input}
                checked={theme === option}
                onChange={() => saveTheme(option)}
              />
              <span className={styles.text}>
                <Icon />
                {t(option)}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
