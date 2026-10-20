'use client';

import { useTranslations } from 'next-intl';
import { useLocation } from './LocationProvider';

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
