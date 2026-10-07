'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';
import styles from './SearchBar.module.css';

// Icono de lupa, Material Icons, Apache-2.0.
const SEARCH_PATH =
  'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z';

export function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations('search');
  const id = useId();

  return (
    <form
      role="search"
      className={styles.form}
      onSubmit={(e) => e.preventDefault()}
    >
      <label htmlFor={id} className={styles.label}>
        {t('label')}
      </label>
      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        aria-hidden="true"
        focusable="false"
        className={styles.icon}
      >
        <path d={SEARCH_PATH} />
      </svg>
      <input
        id={id}
        type="search"
        className={styles.input}
        placeholder={t('placeholder')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        enterKeyHint="search"
      />
      {value && (
        <button
          type="button"
          className={styles.clear}
          aria-label={t('clear')}
          onClick={() => onChange('')}
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </form>
  );
}
