'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useSyncExternalStore } from 'react';
import { openStatus } from '@/lib/open-now';
import type { OpeningHours } from '@/lib/types';
import styles from './OpenNow.module.css';

const REFRESH_MS = 60_000;

// El reloj como fuente externa: cambia cada minuto y, en el servidor, no existe
// (no se pinta nada hasta estar en el navegador).
const subscribe = (notify: () => void) => {
  const timer = setInterval(notify, REFRESH_MS);
  return () => clearInterval(timer);
};
const minuteNow = () => Math.floor(Date.now() / REFRESH_MS);
const noClock = () => null;

// «Abierto ahora · hasta las 23:30», en la hora del local. Depende del reloj de
// quien mira, así que se pinta ya en el navegador y se refresca cada minuto.
export function OpenNow({
  hours,
  timezone,
}: {
  hours: OpeningHours[];
  timezone?: string;
}) {
  const t = useTranslations('detail.openNow');
  const format = useFormatter();
  const minute = useSyncExternalStore(subscribe, minuteNow, noClock);
  const now = minute === null ? null : new Date(minute * REFRESH_MS);

  const status = now && openStatus(hours, timezone, now);
  if (!status) return null;

  // 7 ene 2024 fue domingo: da el nombre del día en cualquier idioma.
  const dayName = (d: number) =>
    format.dateTime(new Date(Date.UTC(2024, 0, 7 + d)), {
      weekday: 'long',
      timeZone: 'UTC',
    });

  if (status.state === 'open') {
    return (
      <p className={`${styles.status} ${styles.open}`}>
        <span className={styles.dot} aria-hidden="true" />
        {t(status.soon ? 'closingSoon' : 'open', { time: status.closes })}
      </p>
    );
  }
  const { opens } = status;
  return (
    <p className={styles.status}>
      <span className={styles.dot} aria-hidden="true" />
      {opens
        ? t(`closedOpens.${opens.when}`, {
            time: opens.time,
            day: dayName(opens.day),
          })
        : t('closed')}
    </p>
  );
}
