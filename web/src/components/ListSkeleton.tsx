'use client';

import { useTranslations } from 'next-intl';
import { Spinner } from './Spinner';
import { SlowNotice } from './SlowNotice';
import styles from './ListSkeleton.module.css';

// La primera carga de la lista: tarjetas vacías con la forma de las reales,
// para que la pantalla no parezca parada mientras llegan los locales.
export function ListSkeleton() {
  const t = useTranslations('load');
  return (
    <div className={styles.screen}>
      <div className={styles.status}>
        <p role="status" className={styles.loading}>
          <Spinner /> {t('loading')}
        </p>
        <SlowNotice active className={styles.slow} />
      </div>
      <ul className={styles.list} aria-hidden="true">
        {[0, 1, 2, 3].map((n) => (
          <li key={n} className={styles.card}>
            <div className={styles.photo} />
            <div className={styles.lines}>
              <div className={styles.line} />
              <div className={styles.line} />
              <div className={styles.line} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
