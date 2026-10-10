'use client';

import { useTranslations } from 'next-intl';
import { useLocation } from './LocationProvider';
import styles from './NearMe.module.css';

export function NearMeButton() {
  const t = useTranslations('nearMe');
  const { status, request, clear } = useLocation();
  const active = status === 'granted';
  return (
    <button
      type="button"
      className={styles.button}
      aria-pressed={active}
      disabled={status === 'asking'}
      onClick={active ? clear : request}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="7" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      </svg>
      <span className={styles.label}>{t('button')}</span>
    </button>
  );
}

// Mensaje de estado: pidiendo permiso, denegado, sin ubicación o fuera de zona.
export function NearMeNotice({ className }: { className?: string }) {
  const t = useTranslations('nearMe');
  const { status } = useLocation();
  const text =
    status === 'asking'
      ? `${t('asking')} ${t('privacy')}`
      : status === 'granted'
        ? t('active')
        : status === 'idle'
          ? null
          : t(status);
  return (
    <p role="status" className={className}>
      {text}
    </p>
  );
}
