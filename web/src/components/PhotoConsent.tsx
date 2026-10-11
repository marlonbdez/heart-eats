'use client';

import { useTranslations } from 'next-intl';
import s from './Form.module.css';

// Casilla de permiso que acompaña a las fotos: son propias o hay permiso del negocio.
export function PhotoConsent({
  id,
  checked,
  error,
  onChange,
}: {
  id: string;
  checked: boolean;
  error: boolean;
  onChange: (checked: boolean) => void;
}) {
  const t = useTranslations('photo');
  return (
    <div className={s.field}>
      <label className={s.check}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <span>{t('consent')}</span>
      </label>
      {error && (
        <p id={`${id}-error`} role="alert" className={s.error}>
          {t('consentError')}
        </p>
      )}
    </div>
  );
}
