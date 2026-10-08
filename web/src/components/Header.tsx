'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { navGroups } from '@/lib/nav';
import { LogoMark } from './LogoMark';
import styles from './Header.module.css';

// Icono "añadir lugar" (chincheta con un +), Material Icons, Apache-2.0.
const ADD_PLACE_PATH =
  'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm4 8h-3v3h-2v-3H8V8h3V5h2v3h3v2z';

export function Header() {
  const t = useTranslations();
  const locale = useLocale();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  const open = () => {
    dialogRef.current?.showModal();
    triggerRef.current?.setAttribute('aria-expanded', 'true');
  };
  const close = () => dialogRef.current?.close();

  // Cerrar al navegar o al cambiar de idioma.
  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname, locale]);

  return (
    <>
      <a className={styles.skip} href="#contenido">
        {t('header.skipToContent')}
      </a>
      <header className={styles.header}>
        <button
          ref={triggerRef}
          type="button"
          className={styles.iconButton}
          aria-label={t('header.openMenu')}
          aria-haspopup="dialog"
          aria-expanded="false"
          onClick={open}
        >
          <span aria-hidden="true">☰</span>
        </button>
        <Link href="/" className={styles.logo}>
          <LogoMark />
          {/* El nombre es una marca: no se traduce. Se lee "Heart" + "Eats", pero es una sola palabra. */}
          <span>
            Heart<span className={styles.eats}>Eats</span>
          </span>
        </Link>
        {/* En móvil solo se ve el icono; el nombre accesible es siempre el texto completo. */}
        <Link href="/propose" className={styles.cta}>
          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            aria-hidden="true"
            focusable="false"
            className={styles.ctaIcon}
          >
            <path fillRule="evenodd" d={ADD_PLACE_PATH} />
          </svg>
          <span className={styles.ctaText}>{t('header.propose')}</span>
        </Link>
      </header>

      <dialog
        ref={dialogRef}
        className={styles.drawer}
        aria-label={t('menu.title')}
        onClose={() => {
          triggerRef.current?.setAttribute('aria-expanded', 'false');
          triggerRef.current?.focus();
        }}
        onClick={(e) => {
          // Un clic sobre el propio <dialog> (no sobre su contenido) es el fondo.
          if (e.target === dialogRef.current) close();
        }}
      >
        <div className={styles.drawerHead}>
          <span className={styles.drawerTitle}>{t('menu.title')}</span>
          <button
            type="button"
            className={styles.iconButton}
            aria-label={t('header.closeMenu')}
            onClick={close}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <nav aria-label={t('menu.title')}>
          {navGroups.map((group) => (
            <section key={group.key} className={styles.group}>
              <h2 className={styles.groupTitle}>
                {t(`menu.groups.${group.key}`)}
              </h2>
              <ul className={styles.list}>
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={styles.link}
                      aria-current={pathname === link.href ? 'page' : undefined}
                    >
                      {t(`menu.links.${link.key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>

        <footer className={styles.drawerFoot}>
          <p className={styles.langLabel}>{t('menu.language')}</p>
          <ul className={styles.langList}>
            {routing.locales.map((code) => (
              <li key={code}>
                {code === locale ? (
                  <span className={styles.langCurrent} aria-current="true">
                    {t(`languages.${code}`)}
                  </span>
                ) : (
                  <Link
                    href={pathname}
                    locale={code}
                    lang={code}
                    hrefLang={code}
                    className={styles.langLink}
                  >
                    {t(`languages.${code}`)}
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <p className={styles.tagline}>{t('app.tagline')}</p>
        </footer>
      </dialog>
    </>
  );
}
