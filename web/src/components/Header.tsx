'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { es } from '@/lib/i18n/es';
import { navGroups } from '@/lib/nav';
import styles from './Header.module.css';

export function Header() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  const open = () => {
    dialogRef.current?.showModal();
    triggerRef.current?.setAttribute('aria-expanded', 'true');
  };
  const close = () => dialogRef.current?.close();

  // Cerrar al navegar.
  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  return (
    <>
      <a className={styles.skip} href="#contenido">
        {es.header.skipToContent}
      </a>
      <header className={styles.header}>
        <button
          ref={triggerRef}
          type="button"
          className={styles.iconButton}
          aria-label={es.header.openMenu}
          aria-haspopup="dialog"
          aria-expanded="false"
          onClick={open}
        >
          <span aria-hidden="true">☰</span>
        </button>
        <Link href="/" className={styles.logo}>
          <span aria-hidden="true" className={styles.heart}>
            ♥
          </span>
          {es.app.name}
        </Link>
        <Link href="/proponer" className={styles.cta}>
          {es.header.propose}
          <span className={styles.longOnly}>{es.header.proposeSuffix}</span>
        </Link>
      </header>

      <dialog
        ref={dialogRef}
        className={styles.drawer}
        aria-label={es.menu.title}
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
          <span className={styles.drawerTitle}>{es.menu.title}</span>
          <button
            type="button"
            className={styles.iconButton}
            aria-label={es.header.closeMenu}
            onClick={close}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <nav aria-label={es.menu.title}>
          {navGroups.map((group) => (
            <section key={group.title} className={styles.group}>
              <h2 className={styles.groupTitle}>{group.title}</h2>
              <ul className={styles.list}>
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={styles.link}
                      aria-current={pathname === link.href ? 'page' : undefined}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>

        <footer className={styles.drawerFoot}>
          <p className={styles.langLabel}>{es.menu.language}</p>
          <p className={styles.lang}>
            <span aria-current="true">Español</span> ·{' '}
            <span className={styles.muted}>{es.menu.soonEnglish}</span>
          </p>
          <p className={styles.tagline}>{es.app.tagline}</p>
        </footer>
      </dialog>
    </>
  );
}
