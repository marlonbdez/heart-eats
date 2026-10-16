'use client';

import { useFormatter, useTranslations } from 'next-intl';
import type { OpeningHours } from '@/lib/types';
import form from './Form.module.css';
import styles from './Moderation.module.css';

// Lunes primero, como en la ficha. El 0 es el domingo.
const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0] as const;

export type HoursDraft = Record<number, { open: string; close: string }>;

// Lo que se ha rellenado, listo para enviar. Un día con solo una de las dos
// horas no vale; un día sin ninguna es un día cerrado.
export function hoursFromDraft(
  draft: HoursDraft,
): OpeningHours[] | 'incomplete' {
  const hours: OpeningHours[] = [];
  for (const day of MONDAY_FIRST) {
    const { open = '', close = '' } = draft[day] ?? {};
    if (!open && !close) continue;
    if (!open || !close) return 'incomplete';
    hours.push({ day, open, close });
  }
  return hours;
}

interface Props {
  value: HoursDraft;
  onChange: (value: HoursDraft) => void;
}

// El horario completo de la semana: sustituye al que hay en la ficha.
export function HoursFields({ value, onChange }: Props) {
  const t = useTranslations('moderation');
  const format = useFormatter();
  // 7 ene 2024 fue domingo: sirve para obtener el nombre del día en cualquier idioma.
  const dayName = (d: number) =>
    format.dateTime(new Date(Date.UTC(2024, 0, 7 + d)), {
      weekday: 'long',
      timeZone: 'UTC',
    });

  const set = (day: number, field: 'open' | 'close', next: string) =>
    onChange({
      ...value,
      [day]: {
        open: value[day]?.open ?? '',
        close: value[day]?.close ?? '',
        [field]: next,
      },
    });

  return (
    <fieldset className={form.options}>
      <legend>{t('hoursLegend')}</legend>
      <p className={styles.meta}>{t('hoursHelp')}</p>
      {MONDAY_FIRST.map((day) => (
        <div
          key={day}
          role="group"
          aria-labelledby={`mod-day-${day}`}
          className={styles.hoursDay}
        >
          <span id={`mod-day-${day}`} className={styles.hoursName}>
            {dayName(day)}
          </span>
          <div className={form.field}>
            <label className={styles.hoursLabel} htmlFor={`mod-open-${day}`}>
              {t('hoursOpen')}
            </label>
            <input
              id={`mod-open-${day}`}
              type="time"
              className={form.input}
              value={value[day]?.open ?? ''}
              onChange={(e) => set(day, 'open', e.target.value)}
            />
          </div>
          <div className={form.field}>
            <label className={styles.hoursLabel} htmlFor={`mod-close-${day}`}>
              {t('hoursClose')}
            </label>
            <input
              id={`mod-close-${day}`}
              type="time"
              className={form.input}
              value={value[day]?.close ?? ''}
              onChange={(e) => set(day, 'close', e.target.value)}
            />
          </div>
        </div>
      ))}
    </fieldset>
  );
}
