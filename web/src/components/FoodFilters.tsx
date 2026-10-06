'use client';

import { useTranslations } from 'next-intl';
import type { FoodTag } from '@/lib/types';
import styles from './FoodFilters.module.css';

// Fila de categorías de comida con icono. Cada una es un interruptor; varias
// activas se combinan con "o" (pizza o café).
export function FoodFilters({
  tags,
  selected,
  onToggle,
}: {
  tags: FoodTag[];
  selected: string[];
  onToggle: (key: string) => void;
}) {
  const t = useTranslations();

  return (
    <div role="group" aria-label={t('filters.label')} className={styles.row}>
      {tags.map((tag) => {
        const active = selected.includes(tag.key);
        return (
          <button
            key={tag.key}
            type="button"
            className={styles.chip}
            aria-pressed={active}
            onClick={() => onToggle(tag.key)}
          >
            <span aria-hidden="true" className={styles.icon}>
              {tag.icon}
            </span>
            {t(`foodTags.${tag.key}`)}
          </button>
        );
      })}
    </div>
  );
}
