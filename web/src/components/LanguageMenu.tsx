'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { routing, type Locale } from '@/i18n/routing';
import { useChooseLanguage } from '@/lib/use-choose-language';
import { TranslateIcon } from './Icons';
import styles from './LanguageMenu.module.css';

// Selector de idioma siempre a la vista en la cabecera, solo con el icono de
// traducir: el menú lateral lo explica con su nombre. Es un botón que despliega
// la lista de idiomas, cada uno escrito en su propio idioma. Lo que
// se elige aquí se recuerda para la próxima visita.
export function LanguageMenu() {
  const t = useTranslations();
  const locale = useLocale();
  const chooseLanguage = useChooseLanguage();
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
    setOpen(false);
    chooseLanguage(code);
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
        <TranslateIcon className={styles.icon} />
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
