'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { sortByDistance } from '@/lib/geo';
import { matchFoodTags, matchesQuery } from '@/lib/search';
import type { FoodTag, RegionCountry, Zone } from '@/lib/types';
import { useZoneRestaurants } from '@/lib/use-zone-restaurants';
import {
  defaultZone,
  findCity,
  sameZone,
  viewBounds,
  zoneFromSearch,
} from '@/lib/zone';
import { DiscoveryProvider } from './DiscoveryContext';
import { FoodFilters } from './FoodFilters';
import { useLocation } from './LocationProvider';
import { MapLoader } from './MapLoader';
import { NearMeButton, NearMeNotice } from './NearMe';
import { Remote } from './Remote';
import { RestaurantCard } from './RestaurantCard';
import { SearchBar } from './SearchBar';
import { ViewSwitch } from './ViewSwitch';
import { ZoneMenu } from './ZoneMenu';
import styles from './Discover.module.css';

// Pantalla principal: buscador + categorías de comida + mapa o lista. El estado vive
// en la URL (?q=…&food=a,b) para poder compartir o recargar una búsqueda.
export function Discover({
  view = 'map',
  regions,
  foodTags,
}: {
  view?: 'map' | 'list';
  regions: RegionCountry[];
  foodTags: FoodTag[];
}) {
  const t = useTranslations();
  const [q, setQ] = useState('');
  const [food, setFood] = useState<string[]>([]);
  // La zona elegida (en la dirección o con el selector); sin elegir, la ciudad
  // con más locales.
  const [chosen, setChosen] = useState<Zone | null>(null);
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);
  const { position, nearest, status } = useLocation();
  const zone = chosen ?? defaultZone(regions);
  const data = useZoneRestaurants(ready ? zone : null);
  const restaurants = useMemo(() => data.restaurants ?? [], [data.restaurants]);
  const city = zone ? findCity(regions, zone) : undefined;
  const bounds = useMemo(() => (city ? viewBounds(city.bbox) : null), [city]);

  // Leer la búsqueda de la URL una vez, ya en el navegador.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const known = new Set(foodTags.map((tag) => tag.key));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQ(params.get('q') ?? '');
    setFood((params.get('food') ?? '').split(',').filter((k) => known.has(k)));
    setChosen(zoneFromSearch(window.location.search, regions));
    setReady(true);
    hydrated.current = true;
  }, [foodTags, regions]);

  // «Cerca de mí» lleva a la ciudad con locales más cercana.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (nearest) setChosen(nearest);
  }, [nearest]);

  // Escribir la búsqueda en la URL sin recargar ni añadir historial.
  useEffect(() => {
    if (!hydrated.current) return;
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (food.length) params.set('food', food.join(','));
    if (chosen) {
      params.set('country', chosen.country);
      params.set('city', chosen.city);
    }
    const qs = params.toString();
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${qs ? `?${qs}` : ''}`,
    );
  }, [q, food, chosen]);

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
  if (chosen) {
    query.country = chosen.country;
    query.city = chosen.city;
  }

  const clearAll = () => {
    setQ('');
    setFood([]);
  };

  // La primera carga de la primera zona: todavía no hay nada que enseñar.
  if (data.restaurants === null) {
    return (
      <Remote
        state={
          data.failed
            ? { status: 'error', retry: data.retry }
            : { status: 'loading' }
        }
      >
        {() => null}
      </Remote>
    );
  }

  return (
    <DiscoveryProvider value={{ view, query }}>
      <div className={styles.screen}>
        <div className={styles.filters}>
          <div className={styles.searchRow}>
            {zone && (
              <ZoneMenu regions={regions} zone={zone} onSelect={setChosen} />
            )}
            <SearchBar value={q} onChange={setQ} />
          </div>
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
          {data.loading && (
            <p role="status" className={styles.srOnly}>
              {t('load.loading')}
            </p>
          )}
          {data.failed && (
            <div role="alert" className={styles.zoneError}>
              <p>{t('load.error')}</p>
              <button
                type="button"
                className={styles.secondary}
                onClick={data.retry}
              >
                {t('load.retry')}
              </button>
            </div>
          )}
          {view === 'map' ? (
            <>
              <ViewSwitch view={view} query={query} />
              <p role="status" className={styles.srOnly}>
                {t('results.count', { count: visible.length })}
              </p>
              <MapLoader
                restaurants={visible}
                bounds={bounds}
                focus={hasFilters}
                followUser={!!position && sameZone(zone, nearest)}
              />
              <div className={styles.nearMe}>
                <NearMeButton />
              </div>
              {status !== 'idle' && (
                <NearMeNotice className={styles.mapNotice} />
              )}
            </>
          ) : (
            <div className={styles.listScroll}>
              <div className={styles.listHeader}>
                <ViewSwitch view={view} query={query} />
                <NearMeButton />
              </div>
              <p role="status" className={styles.count}>
                {t('results.count', { count: visible.length })}
              </p>
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
              <h2 className={styles.emptyTitle}>
                {t(hasFilters ? 'results.emptyTitle' : 'results.noneTitle')}
              </h2>
              <p>{t(hasFilters ? 'results.emptyBody' : 'results.noneBody')}</p>
              <div className={styles.emptyActions}>
                {hasFilters && (
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={clearAll}
                  >
                    {t('results.clearFilters')}
                  </button>
                )}
                <Link href="/propose" className={styles.primary}>
                  {t('results.propose')}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </DiscoveryProvider>
  );
}
