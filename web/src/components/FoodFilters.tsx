'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { FoodTag } from '@/lib/types';
import styles from './FoodFilters.module.css';

// Fila de categorías de comida con icono. Cada una es un interruptor; varias
// activas se combinan con "o" (pizza o café). Si no caben, se deslizan con el
// dedo; con ratón salen unas flechas en el lado donde aún hay más.
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
  const row = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState({ before: false, after: false });

  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const update = () => {
      // Unos píxeles de margen: el ajuste a la primera categoría deja 2 px.
      const before = el.scrollLeft > 4;
      const after = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
      setMore((cur) =>
        cur.before === before && cur.after === after ? cur : { before, after },
      );
    };
    el.addEventListener('scroll', update, { passive: true });
    // Avisan también al cambiar el tamaño y al cambiar las categorías.
    const resize = new ResizeObserver(update);
    resize.observe(el);
    const mutation = new MutationObserver(update);
    mutation.observe(el, { childList: true });
    return () => {
      el.removeEventListener('scroll', update);
      resize.disconnect();
      mutation.disconnect();
    };
  }, []);

  const scroll = useCallback((direction: 1 | -1) => {
    const el = row.current;
    if (!el) return;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({
      left: direction * el.clientWidth * 0.8,
      behavior: calm ? 'auto' : 'smooth',
    });
  }, []);

  if (tags.length === 0) return null;

  return (
    <div className={styles.wrap}>
      {more.before && (
        <button
          type="button"
          className={`${styles.arrow} ${styles.before}`}
          aria-label={t('filters.previous')}
          tabIndex={-1}
          onClick={() => scroll(-1)}
        >
          <span aria-hidden="true">‹</span>
        </button>
      )}
      <div
        ref={row}
        role="group"
        aria-label={t('filters.label')}
        className={styles.row}
        data-more-before={more.before}
        data-more-after={more.after}
      >
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
      {more.after && (
        <button
          type="button"
          className={`${styles.arrow} ${styles.after}`}
          aria-label={t('filters.next')}
          tabIndex={-1}
          onClick={() => scroll(1)}
        >
          <span aria-hidden="true">›</span>
        </button>
      )}
    </div>
  );
}
