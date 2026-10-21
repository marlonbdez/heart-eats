'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useSyncExternalStore } from 'react';
import { isDark, toggleTheme, watchTheme } from '@/lib/theme';
import { MoonIcon, SunIcon } from './Icons';
import styles from './SettingRow.module.css';

// El tema en una fila del menú lateral: un toque pasa de claro a oscuro y al
// revés, así que se ve al momento. El servidor dibuja «claro» y el navegador lo
// corrige al hidratar, con lo que dejó puesto el script del <head>.
export function ThemeSetting() {
  const t = useTranslations('menu.theme');
  const locale = useLocale();
  const dark = useSyncExternalStore(watchTheme, isDark, () => false);
  const current = t(dark ? 'dark' : 'light');
  // En medio de una frase, en minúscula.
  const spoken = (name: string) => name.toLocaleLowerCase(locale);
  const Icon = dark ? MoonIcon : SunIcon;

  return (
    <>
      <button
        type="button"
        className={styles.row}
        aria-label={t('change', {
          current: spoken(current),
          next: spoken(t(dark ? 'light' : 'dark')),
        })}
        onClick={toggleTheme}
      >
        <Icon className={styles.icon} />
        <span className={styles.label}>{t('label')}</span>
        <span className={styles.value}>{current}</span>
      </button>
      {/* Avisa del cambio a quien no lo ve: el nombre del botón cambia pero no siempre se lee. */}
      <span role="status" className={styles.hidden}>
        {t('now', { current: spoken(current) })}
      </span>
    </>
  );
}
