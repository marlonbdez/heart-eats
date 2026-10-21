'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { saveLanguage } from '@/lib/language';
import { Chevron } from './Chevron';
import styles from './LanguageMenu.module.css';

// Globo (Material Icons, Apache-2.0).
const GLOBE_PATH =
  'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95a15.65 15.65 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.92 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.99 7.99 0 0 1 5.08 16zm2.95-8H5.08a7.99 7.99 0 0 1 4.33-3.56A15.65 15.65 0 0 0 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 0 1-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z';

// Selector de idioma siempre a la vista en la cabecera. Es un botón que
// despliega la lista de idiomas, cada uno escrito en su propio idioma. Lo que
// se elige aquí se recuerda para la próxima visita.
export function LanguageMenu() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Se cierra con Escape (devolviendo el foco al botón) y al pulsar fuera.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  const choose = (code: Locale) => {
    saveLanguage(code);
    setOpen(false);
    if (code === locale) return;
    // Cambia de idioma sin perder la búsqueda (?q, ?food), que solo se conoce
    // en el navegador.
    router.replace(`${pathname}${window.location.search}`, { locale: code });
  };

  return (
    <div
      ref={rootRef}
      className={styles.root}
      onBlur={(e) => {
        // Al salir con el teclado (Tab), se cierra.
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className={styles.button}
        aria-expanded={open}
        aria-controls="language-list"
        aria-label={`${locale.toUpperCase()} · ${t('header.language')}`}
        onClick={() => setOpen((value) => !value)}
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          aria-hidden="true"
          focusable="false"
          className={styles.icon}
        >
          <path d={GLOBE_PATH} />
        </svg>
        <span className={styles.code}>{locale.toUpperCase()}</span>
        <Chevron className={styles.chevron} />
      </button>
      <ul id="language-list" className={styles.list} hidden={!open}>
        {routing.locales.map((code) => (
          <li key={code}>
            <button
              type="button"
              lang={code}
              className={styles.option}
              aria-current={code === locale ? 'true' : undefined}
              onClick={() => choose(code)}
            >
              <span>{t(`languages.${code}`)}</span>
              {code === locale && <span aria-hidden="true">✓</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
