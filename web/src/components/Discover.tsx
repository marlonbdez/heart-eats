'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { sortByDistance, type Position } from '@/lib/geo';
import { matchFoodTags, matchesQuery } from '@/lib/search';
import type { Bbox, FoodTag, RegionCountry, Zone } from '@/lib/types';
import { useMediaQuery } from '@/lib/use-media-query';
import { useAreaRestaurants } from '@/lib/use-area-restaurants';
import { useZoneRestaurants } from '@/lib/use-zone-restaurants';
import {
  apiBbox,
  defaultZone,
  findCity,
  nearestCity,
  sameZone,
  viewBounds,
  zoneFromSearch,
} from '@/lib/zone';
import { DiscoveryProvider } from './DiscoveryContext';
import { FoodFilters } from './FoodFilters';
import { useLocation } from './LocationProvider';
import { MapLoader } from './MapLoader';
import type { MapMove } from './MapView';
import { NearMeNotice } from './NearMe';
import { Remote } from './Remote';
import { RestaurantCard } from './RestaurantCard';
import { SearchBar } from './SearchBar';
import { SlowNotice } from './SlowNotice';
import { Spinner } from './Spinner';
import { ListSkeleton } from './ListSkeleton';
import { MapButton, ViewSwitch } from './ViewSwitch';
import { ZoneMenu } from './ZoneMenu';
import styles from './Discover.module.css';

// Pantalla principal: buscador + categorías de comida + mapa o lista. El estado vive
// en la URL (?q=…&food=a,b) para poder compartir o recargar una búsqueda.
export function Discover({
  view = 'list',
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
  // Cada vez que se pide ir a una zona, el mapa vuelve a ella aunque ya fuera
  // la elegida.
  const [recenter, setRecenter] = useState(0);
  // Lo que ve el mapa tras moverlo la persona. Solo vale mientras no cambie la
  // zona ni los filtros (`epoch`): entonces se vuelve a los locales de la zona.
  const [moved, setMoved] = useState<{
    epoch: string;
    bbox: Bbox;
    center: Position;
  } | null>(null);
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);
  const { position, nearest, status } = useLocation();
  // En pantallas anchas, lista y mapa a la vez; en las estrechas, una vista.
  const split = useMediaQuery('(min-width: 900px)');
  const showMap = view === 'map' || split;
  const showList = view === 'list' || split;
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
    /* eslint-disable react-hooks/set-state-in-effect */
    if (nearest) {
      setChosen(nearest);
      setRecenter((n) => n + 1);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
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

  // En el mapa y sin búsqueda, tras moverlo se piden los locales de lo que se ve
  // (con búsqueda se sigue buscando en toda la zona).
  const epoch = `${zone?.country}/${zone?.city}|${recenter}|${hasFilters}`;
  const exploring =
    showMap && !hasFilters && moved?.epoch === epoch ? moved : null;
  const area = useAreaRestaurants(exploring?.bbox ?? null);
  const onMap = exploring && area.restaurants ? area.restaurants : visible;
  // Con la lista al lado, enseña lo mismo que el mapa (más cercanos primero si
  // la persona compartió su ubicación); sola, enseña la zona entera.
  const listed = !split
    ? visible
    : position
      ? sortByDistance(onMap, position)
      : onMap;
  // El local marcado en el mapa; su tarjeta se ve en la lista.
  const [picked, setPicked] = useState<string | null>(null);
  const selected =
    picked && onMap.some((r) => r.slug === picked) ? picked : null;
  // El local que la persona señala con el ratón o el foco, en su tarjeta o en
  // su marcador: el otro se resalta.
  const [hovered, setHovered] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!split || !selected) return;
    const card = listRef.current?.querySelector(
      `[data-slug="${CSS.escape(selected)}"]`,
    );
    card?.scrollIntoView({
      block: 'nearest',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  }, [selected, split]);
  // La zona que figura en el selector sigue al mapa: la ciudad más cercana.
  const shownZone = exploring
    ? (nearestCity(regions, exploring.center)?.zone ?? zone)
    : zone;
  const areaNote =
    exploring && area.restaurants && !area.loading
      ? area.truncated
        ? t('map.zoomIn')
        : area.restaurants.length === 0
          ? t('map.areaEmpty')
          : ''
      : '';
  const loading = data.loading || (!!exploring && area.loading);
  const failed = data.failed || (!!exploring && area.failed);
  const retry = data.failed ? data.retry : area.retry;
  const selectZone = (next: Zone) => {
    setChosen(next);
    setRecenter((n) => n + 1);
  };
  const onUserMove = (move: MapMove) =>
    setMoved({ epoch, bbox: apiBbox(move.bbox), center: move.center });

  // Etiquetas traducidas para sugerir una categoría al escribir ("piz" → Pizza).
  const labelled = useMemo(
    () => foodTags.map((tag) => ({ ...tag, label: t(`foodTags.${tag.key}`) })),
    [foodTags, t],
  );
  const suggestions = matchFoodTags(q, labelled).filter(
    (tag) => !food.includes(tag.key),
  );

  // Solo las categorías con locales en la zona, de más a menos; las elegidas
  // siguen a la vista aunque la zona no tenga ninguno.
  const zoneTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of restaurants) {
      for (const key of r.foodTags) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const count = (tag: FoodTag) => counts.get(tag.key) ?? 0;
    return foodTags
      .filter((tag) => count(tag) > 0 || food.includes(tag.key))
      .sort((a, b) => count(b) - count(a));
  }, [foodTags, restaurants, food]);

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
    return data.failed ? (
      <Remote state={{ status: 'error', retry: data.retry }}>
        {() => null}
      </Remote>
    ) : (
      <ListSkeleton />
    );
  }

  const empty = visible.length === 0 && suggestions.length === 0 && (
    <div className={styles.empty}>
      <h2 className={styles.emptyTitle}>
        {t(hasFilters ? 'results.emptyTitle' : 'results.noneTitle')}
      </h2>
      <p>{t(hasFilters ? 'results.emptyBody' : 'results.noneBody')}</p>
      <div className={styles.emptyActions}>
        {hasFilters && (
          <button type="button" className={styles.secondary} onClick={clearAll}>
            {t('results.clearFilters')}
          </button>
        )}
        <Link href="/propose" className={styles.primary}>
          {t('results.propose')}
        </Link>
      </div>
    </div>
  );

  return (
    <DiscoveryProvider value={{ view, query }}>
      <div className={styles.screen}>
        <div className={styles.filters}>
          <div className={styles.searchRow}>
            {shownZone && (
              <ZoneMenu
                regions={regions}
                zone={shownZone}
                onSelect={selectZone}
              />
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
          <FoodFilters tags={zoneTags} selected={food} onToggle={toggleFood} />
        </div>

        <div className={styles.area} data-split={split}>
          {loading && <div className={styles.loadingBar} aria-hidden="true" />}
          <div className={styles.loadingNote}>
            <p
              role="status"
              className={loading ? styles.loadingPill : styles.srOnly}
            >
              {loading && (
                <>
                  <Spinner /> {t('load.loading')}
                </>
              )}
            </p>
            <SlowNotice active={loading} className={styles.slowPill} />
          </div>
          {failed && (
            <div role="alert" className={styles.zoneError}>
              <p>{t('load.error')}</p>
              <button
                type="button"
                className={styles.secondary}
                onClick={retry}
              >
                {t('load.retry')}
              </button>
            </div>
          )}
          {showMap && (
            <div key="map" className={styles.mapPane}>
              {!split && (
                <>
                  <ViewSwitch view={view} query={query} />
                  <p role="status" className={styles.srOnly}>
                    {t('results.count', { count: onMap.length })}
                  </p>
                  <p
                    role="status"
                    className={areaNote ? styles.areaNotice : styles.srOnly}
                  >
                    {areaNote}
                  </p>
                </>
              )}
              <MapLoader
                restaurants={onMap}
                bounds={bounds}
                recenter={recenter}
                focus={hasFilters}
                followUser={!!position && sameZone(zone, nearest)}
                split={split}
                selected={selected}
                onSelect={setPicked}
                highlighted={split ? hovered : null}
                onHover={setHovered}
                onUserMove={onUserMove}
              />
              {!split && (
                <>
                  {status !== 'idle' && (
                    <NearMeNotice className={styles.mapNotice} />
                  )}
                </>
              )}
            </div>
          )}
          {showList && (
            <div key="list" className={styles.listPane}>
              <div className={styles.listScroll} ref={listRef}>
                <p className={styles.tagline}>{t('app.tagline')}</p>
                <div className={styles.listHeader}>
                  <p role="status" className={styles.countInline}>
                    {t(
                      split && exploring
                        ? 'results.countArea'
                        : 'results.count',
                      {
                        count: listed.length,
                      },
                    )}
                  </p>
                </div>
                {split && (
                  <p
                    role="status"
                    className={areaNote ? styles.listNotice : styles.srOnly}
                  >
                    {areaNote}
                  </p>
                )}
                {status !== 'idle' && (
                  <NearMeNotice className={styles.listNotice} />
                )}
                <ul className={styles.list} aria-label={t('results.listLabel')}>
                  {listed.map((r) => (
                    <li
                      key={r.slug}
                      className={styles.item}
                      data-slug={r.slug}
                      data-selected={r.slug === selected}
                      data-hover={split && r.slug === hovered}
                      onMouseEnter={
                        split ? () => setHovered(r.slug) : undefined
                      }
                      onMouseLeave={split ? () => setHovered(null) : undefined}
                      onFocus={split ? () => setHovered(r.slug) : undefined}
                      onBlur={split ? () => setHovered(null) : undefined}
                    >
                      <RestaurantCard restaurant={r} variant="list" />
                    </li>
                  ))}
                </ul>
                {split && empty}
              </div>
              {!split && <MapButton query={query} />}
            </div>
          )}
          {!split && empty}
        </div>
      </div>
    </DiscoveryProvider>
  );
}
