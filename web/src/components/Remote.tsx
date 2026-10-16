'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { Loaded } from '@/lib/use-load';
import styles from './Remote.module.css';

// Estado de una carga desde la API: cargando, error con reintento, o el
// contenido cuando ya hay datos.
export function Remote<T>({
  state,
  children,
}: {
  state: Loaded<T>;
  children: (data: T) => ReactNode;
}) {
  const t = useTranslations('load');
  if (state.status === 'ready') return <>{children(state.data)}</>;
  if (state.status === 'loading') {
    return (
      <p role="status" className={styles.note}>
        {t('loading')}
      </p>
    );
  }
  return (
    <div role="alert" className={styles.note}>
      <p>{t('error')}</p>
      <button type="button" className={styles.retry} onClick={state.retry}>
        {t('retry')}
      </button>
    </div>
  );
}
