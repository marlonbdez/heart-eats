import { useFormatter, useTranslations } from 'next-intl';
import { groupHours } from '@/lib/hours';
import type { OpeningHours } from '@/lib/types';
import styles from './RestaurantDetail.module.css';

export function HoursBlock({ hours }: { hours: OpeningHours[] }) {
  const t = useTranslations('detail');
  const format = useFormatter();
  // 7 ene 2024 fue domingo: sirve para obtener el nombre del día en cualquier idioma.
  const dayName = (d: number) =>
    format.dateTime(new Date(Date.UTC(2024, 0, 7 + d)), {
      weekday: 'long',
      timeZone: 'UTC',
    });
  const groups = groupHours(hours);

  return (
    <section aria-labelledby="horario">
      <h2 id="horario">{t('hours')}</h2>
      <dl className={styles.hours}>
        {groups.map((g) => {
          const first = dayName(g.days[0]);
          const last = dayName(g.days[g.days.length - 1]);
          const label =
            g.days.length === 1
              ? first
              : t('dayRange', { from: first, to: last });
          return (
            <div key={g.days.join()} className={styles.hoursRow}>
              <dt>{label}</dt>
              <dd>
                {g.range ? `${g.range.open} – ${g.range.close}` : t('closed')}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
