'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRef } from 'react';
import { routing } from '@/i18n/routing';
import { useChooseLanguage } from '@/lib/use-choose-language';
import { TranslateIcon } from './Icons';
import styles from './SettingRow.module.css';

// El idioma en una fila del menú lateral, con el actual a la vista. Al tocarla
// se abre un diálogo pequeño con los idiomas, cada uno escrito en el suyo; sirve
// igual con dos que con veinte.
export function LanguageSetting() {
  const t = useTranslations();
  const locale = useLocale();
  const choose = useChooseLanguage();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        className={styles.row}
        aria-haspopup="dialog"
        onClick={() => dialogRef.current?.showModal()}
      >
        <TranslateIcon size={20} className={styles.icon} />
        <span className={styles.label}>{t('header.language')}</span>
        <span className={styles.value} lang={locale}>
          {t(`languages.${locale}`)}
        </span>
      </button>

      <dialog
        ref={dialogRef}
        className={styles.picker}
        aria-label={t('header.language')}
        onClick={(e) => {
          // Un clic sobre el propio <dialog> (no sobre su contenido) es el fondo.
          if (e.target === dialogRef.current) close();
        }}
      >
        <div className={styles.pickerHead}>
          <h2 className={styles.pickerTitle}>{t('header.language')}</h2>
          <button
            type="button"
            className={styles.close}
            aria-label={t('menu.closeLanguage')}
            onClick={close}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <ul className={styles.options}>
          {routing.locales.map((code) => (
            <li key={code}>
              <button
                type="button"
                lang={code}
                className={styles.option}
                aria-current={code === locale ? 'true' : undefined}
                onClick={() => {
                  close();
                  choose(code);
                }}
              >
                <span>{t(`languages.${code}`)}</span>
                {code === locale && <span aria-hidden="true">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      </dialog>
    </>
  );
}
