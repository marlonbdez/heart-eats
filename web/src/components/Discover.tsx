'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { sortByDistance } from '@/lib/geo';
import { matchFoodTags, matchesQuery } from '@/lib/search';
import type { FoodTag, Restaurant } from '@/lib/types';
import { FoodFilters } from './FoodFilters';
import { useLocation } from './LocationProvider';
import { MapLoader } from './MapLoader';
import { NearMeButton, NearMeNotice } from './NearMe';
import { RestaurantCard } from './RestaurantCard';
import { SearchBar } from './SearchBar';
import { ViewSwitch } from './ViewSwitch';
import styles from './Discover.module.css';

// Pantalla principal: buscador + categorías de comida + mapa o lista. El estado vive
// en la URL (?q=…&food=a,b) para poder compartir o recargar una búsqueda.
export function Discover({
  view = 'map',
  restaurants,
  foodTags,
}: {
  view?: 'map' | 'list';
  restaurants: Restaurant[];
  foodTags: FoodTag[];
}) {
  const t = useTranslations();
  const [q, setQ] = useState('');
  const [food, setFood] = useState<string[]>([]);
  const hydrated = useRef(false);
  const { position, status } = useLocation();

  // Leer la búsqueda de la URL una vez, ya en el navegador.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const known = new Set(foodTags.map((tag) => tag.key));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQ(params.get('q') ?? '');
    setFood((params.get('food') ?? '').split(',').filter((k) => known.has(k)));
    hydrated.current = true;
  }, [foodTags]);

  // Escribir la búsqueda en la URL sin recargar ni añadir historial.
  useEffect(() => {
    if (!hydrated.current) return;
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (food.length) params.set('food', food.join(','));
    const qs = params.toString();
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${qs ? `?${qs}` : ''}`,
    );
  }, [q, food]);

  // Con ubicación compartida, los más cercanos primero.
  const visible = useMemo(() => {
    const found = restaurants.filter((r) => matchesQuery(r, { q, food }));
    return position ? sortByDistance(found, position) : found;
  }, [restaurants, q, food, position]);
  const hasFilters = q.trim() !== '' || food.length > 0;

  // Etiquetas traducidas para sugerir una categoría al escribir ("piz" → Pizza).
  const labelled = useMemo(
    () => foodTags.map((tag) => ({ ...tag, label: t(`foodTags.${tag.key}`) })),
    [foodTags, t],
  );
  const suggestions = matchFoodTags(q, labelled).filter(
    (tag) => !food.includes(tag.key),
  );

  const toggleFood = (key: string) =>
    setFood((cur) =>
      cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key],
    );
  // Si lo escrito parece una comida, la sugerencia ya es la ayuda: no se avisa
  // de "sin resultados" a la vez.
  const query: Record<string, string> = {};
  if (q.trim()) query.q = q.trim();
  if (food.length) query.food = food.join(',');

  const clearAll = () => {
    setQ('');
    setFood([]);
  };

  return (
    <div className={styles.screen}>
      <div className={styles.filters}>
        <SearchBar value={q} onChange={setQ} />
        {suggestions.length > 0 && (
          <div className={styles.suggestions}>
            {suggestions.slice(0, 3).map((tag) => (
              <button
                key={tag.key}
                type="button"
                className={styles.suggestion}
                onClick={() => {
                  toggleFood(tag.key);
                  setQ('');
                }}
              >
                <span aria-hidden="true">{tag.icon}</span>{' '}
                {t('search.suggestFood', { food: tag.label })}
              </button>
            ))}
          </div>
        )}
        <FoodFilters tags={foodTags} selected={food} onToggle={toggleFood} />
      </div>

      <div className={styles.area}>
        {view === 'map' ? (
          <>
            <p role="status" className={styles.srOnly}>
              {t('results.count', { count: visible.length })}
            </p>
            <MapLoader restaurants={visible} focus={hasFilters} />
            <div className={styles.barMap}>
              <ViewSwitch view={view} query={query} />
              <NearMeButton />
            </div>
            {status !== 'idle' && <NearMeNotice className={styles.mapNotice} />}
          </>
        ) : (
          <div className={styles.listScroll}>
            <div className={styles.barList}>
              <ViewSwitch view={view} query={query} />
              <NearMeButton />
            </div>
            <div className={styles.listHeader}>
              <p role="status" className={styles.count}>
                {t('results.count', { count: visible.length })}
              </p>
            </div>
            {status !== 'idle' && (
              <NearMeNotice className={styles.listNotice} />
            )}
            <ul className={styles.list} aria-label={t('results.listLabel')}>
              {visible.map((r) => (
                <li key={r.slug} className={styles.item}>
                  <RestaurantCard restaurant={r} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {visible.length === 0 && suggestions.length === 0 && (
          <div className={styles.empty}>
            <h2 className={styles.emptyTitle}>{t('results.emptyTitle')}</h2>
            <p>{t('results.emptyBody')}</p>
            <div className={styles.emptyActions}>
              <button
                type="button"
                className={styles.secondary}
                onClick={clearAll}
              >
                {t('results.clearFilters')}
              </button>
              <Link href="/propose" className={styles.primary}>
                {t('results.propose')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
