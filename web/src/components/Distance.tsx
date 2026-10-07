'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { distanceMeters, type Position } from '@/lib/geo';
import { useLocation } from './LocationProvider';

// "350 m" / "1,2 km" desde la posición de la persona, si la ha compartido.
export function Distance({
  location,
  prefix = ' · ',
}: {
  location: Position;
  prefix?: string;
}) {
  const { position } = useLocation();
  const format = useFormatter();
  const t = useTranslations('nearMe');
  if (!position) return null;
  const m = distanceMeters(position, location);
  const text =
    m < 1000
      ? format.number(Math.max(10, Math.round(m / 10) * 10), {
          style: 'unit',
          unit: 'meter',
        })
      : format.number(m / 1000, {
          style: 'unit',
          unit: 'kilometer',
          maximumFractionDigits: 1,
        });
  return (
    <span>
      {prefix}
      <span aria-label={t('distanceLabel', { distance: text })}>{text}</span>
    </span>
  );
}
