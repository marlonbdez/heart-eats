'use client';

import type { Map as MapLibreMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { defaultView, mapStyles } from '@/lib/map-config';
import type { Restaurant } from '@/lib/types';
import { useLocation } from './LocationProvider';
import { RestaurantCard } from './RestaurantCard';
import { markerSvg } from '@/lib/marker';
import styles from './MapView.module.css';

type MapLibre = typeof import('maplibre-gl');

// Alto que tapan la tarjeta de vista previa y el conmutador, desde abajo.
const CARD_CLEARANCE = 290;

// `focus`: hay búsqueda o filtros activos, así que el mapa se encuadra sobre
// los resultados; sin ellos, vuelve a la vista inicial.
export function MapView({
  restaurants,
  focus = false,
}: {
  restaurants: Restaurant[];
  focus?: boolean;
}) {
  const t = useTranslations();
  const { position } = useLocation();
  const youRef = useRef<Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const libRef = useRef<MapLibre | null>(null);
  const markers = useRef(
    new Map<string, { marker: Marker; el: HTMLButtonElement }>(),
  );
  const firstView = useRef(true);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  // Si el local seleccionado deja de estar entre los resultados, se cierra su tarjeta.
  if (selected && !restaurants.some((r) => r.slug === selected)) {
    setSelected(null);
  }

  // Crear el mapa una sola vez.
  useEffect(() => {
    let cancelled = false;
    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const styleUrl = () =>
      colorScheme.matches ? mapStyles.dark : mapStyles.light;
    const onSchemeChange = () => mapRef.current?.setStyle(styleUrl());
    const markerMap = markers.current;

    (async () => {
      const lib = await import('maplibre-gl');
      // Ver scripts/copy-maplibre-worker.mjs
      lib.setWorkerUrl(
        `${window.location.origin}/maplibre/maplibre-gl-worker.mjs`,
      );
      if (cancelled || !containerRef.current) return;
      let map: MapLibreMap;
      try {
        map = new lib.Map({
          container: containerRef.current,
          style: styleUrl(),
          center: defaultView.center,
          zoom: defaultView.zoom,
        });
      } catch {
        setFailed(true);
        return;
      }
      map.addControl(
        new lib.NavigationControl({ showCompass: false }),
        'top-right',
      );
      colorScheme.addEventListener('change', onSchemeChange);

      // Un clic en el fondo cierra la vista previa (no en un marcador).
      map.on('click', (e) => {
        const target = e.originalEvent.target as HTMLElement | null;
        if (target?.closest('[data-marker]')) return;
        setSelected(null);
      });

      mapRef.current = map;
      libRef.current = lib;
      setReady(true);
    })();

    return () => {
      cancelled = true;
      colorScheme.removeEventListener('change', onSchemeChange);
      mapRef.current?.remove();
      mapRef.current = null;
      markerMap.clear();
      setReady(false);
    };
  }, []);

  // Mantener los marcadores al día con los resultados.
  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!ready || !map || !lib) return;

    const wanted = new Set(restaurants.map((r) => r.slug));
    for (const [slug, { marker }] of markers.current) {
      if (!wanted.has(slug)) {
        marker.remove();
        markers.current.delete(slug);
      }
    }
    for (const r of restaurants) {
      const label = t('map.markerLabel', { name: r.name });
      const existing = markers.current.get(r.slug);
      if (existing) {
        existing.el.setAttribute('aria-label', label);
        continue;
      }
      const el = document.createElement('button');
      el.type = 'button';
      el.className = styles.marker;
      el.dataset.marker = r.slug;
      el.setAttribute('aria-label', label);
      el.innerHTML = markerSvg(r.slug);
      el.addEventListener('click', () => setSelected(r.slug));
      const marker = new lib.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([r.location.lng, r.location.lat])
        .addTo(map);
      markers.current.set(r.slug, { marker, el });
    }
  }, [restaurants, t, ready]);

  // Punto de "tu posición" y, al compartirla, centrar el mapa en ella.
  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!ready || !map || !lib) return;
    youRef.current?.remove();
    youRef.current = null;
    if (!position) return;
    const el = document.createElement('div');
    el.className = styles.you;
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', t('map.you'));
    youRef.current = new lib.Marker({ element: el })
      .setLngLat([position.lng, position.lat])
      .addTo(map);
    map.easeTo({
      center: [position.lng, position.lat],
      zoom: 14,
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 0
        : 600,
    });
  }, [position, ready, t]);

  // Encuadrar los resultados cuando hay búsqueda; volver a la vista inicial si no.
  const resultKey = restaurants.map((r) => r.slug).join(',');
  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!ready || !map || !lib) return;
    const isFirst = firstView.current;
    firstView.current = false;
    if (isFirst && !focus) return;

    const duration =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches || isFirst
        ? 0
        : 600;
    if (!focus) {
      map.easeTo({
        center: defaultView.center,
        zoom: defaultView.zoom,
        duration,
      });
      return;
    }
    if (restaurants.length === 0) return;
    const bounds = new lib.LngLatBounds();
    for (const r of restaurants)
      bounds.extend([r.location.lng, r.location.lat]);
    map.fitBounds(bounds, {
      padding: { top: 70, bottom: 190, left: 50, right: 50 },
      maxZoom: 15,
      duration,
    });
    // `restaurants` entra por resultKey: solo reencuadra si cambian los resultados.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultKey, focus, ready]);

  // Marcador seleccionado y foco en la tarjeta.
  useEffect(() => {
    markers.current.forEach(({ el }, slug) => {
      el.classList.toggle(styles.selected, slug === selected);
    });
    if (!selected) return;
    cardRef.current?.focus();

    // La tarjeta ocupa la parte baja: si el corazón queda tapado (o fuera de
    // pantalla), se desplaza el mapa lo justo para que siga a la vista.
    const map = mapRef.current;
    const ll = markers.current.get(selected)?.marker.getLngLat();
    if (!map || !ll) return;
    const height = map.getContainer().clientHeight;
    const { y } = map.project(ll);
    const bottomLimit = height - CARD_CLEARANCE;
    const topLimit = 90;
    const dy =
      y > bottomLimit ? y - bottomLimit : y < topLimit ? y - topLimit : 0;
    if (dy !== 0) {
      map.panBy([0, dy], {
        duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 0
          : 300,
      });
    }
  }, [selected]);

  const close = () => {
    const slug = selected;
    setSelected(null);
    if (slug) markers.current.get(slug)?.el.focus();
  };

  const current = restaurants.find((r) => r.slug === selected);

  return (
    <div className={styles.wrap}>
      <div
        ref={containerRef}
        className={styles.map}
        role="region"
        aria-label={t('map.label')}
      />
      {failed && (
        <p role="alert" className={styles.error}>
          {t('map.loadError')}{' '}
          <Link href="/list">{t('map.loadErrorLink')}</Link>
        </p>
      )}
      {current && (
        <aside
          ref={cardRef}
          className={styles.preview}
          aria-label={t('card.label')}
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === 'Escape') close();
          }}
        >
          <button
            type="button"
            className={styles.close}
            aria-label={t('card.close')}
            onClick={close}
          >
            <span aria-hidden="true">×</span>
          </button>
          <RestaurantCard restaurant={current} />
        </aside>
      )}
    </div>
  );
}
