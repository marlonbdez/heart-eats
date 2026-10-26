'use client';

import { useTranslations } from 'next-intl';
import {
  ACCESSIBILITY_FEATURES,
  type AccessibilityFeature,
} from '@/lib/accessibility';
import s from './Form.module.css';

// Una casilla por cada cosa que puede ofrecer el local. Quien lo usa pone el
// `fieldset` y su leyenda.
export function AccessibilityFields({
  value,
  onChange,
  describedBy,
}: {
  value: AccessibilityFeature[];
  onChange: (next: AccessibilityFeature[]) => void;
  describedBy?: string;
}) {
  const t = useTranslations('accessibility.features');
  const toggle = (key: AccessibilityFeature) =>
    onChange(
      ACCESSIBILITY_FEATURES.filter((k) =>
        k === key ? !value.includes(k) : value.includes(k),
      ),
    );

  return (
    <div className={s.options} aria-describedby={describedBy}>
      {ACCESSIBILITY_FEATURES.map((key) => (
        <label key={key} className={s.check}>
          <input
            type="checkbox"
            checked={value.includes(key)}
            onChange={() => toggle(key)}
          />
          <span>{t(key)}</span>
        </label>
      ))}
    </div>
  );
}
