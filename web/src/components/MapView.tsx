'use client';

import type { Map as MapLibreMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { mapStyles, worldView } from '@/lib/map-config';
import type { Bbox, Restaurant } from '@/lib/types';
import { useLocation } from './LocationProvider';
import { RestaurantCard } from './RestaurantCard';
import { MARKER_SVG } from '@/lib/marker';
import styles from './MapView.module.css';

type MapLibre = typeof import('maplibre-gl');

// Alto que tapa la tarjeta de vista previa, desde abajo.
const CARD_CLEARANCE = 290;

type Bounds = [[number, number], [number, number]];

// Lo que se ve tras mover el mapa: el rectángulo y su centro.
export interface MapMove {
  bbox: Bbox;
  center: { lat: number; lng: number };
}

// Pausa tras dejar de mover el mapa antes de pedir los locales de esa zona.
const MOVE_DEBOUNCE_MS = 350;

// Encuadre de una zona: deja libres los bordes donde van el conmutador (arriba;
// el marcador sube 44 px desde su punto) y, abajo, «Cerca de mí» y la tarjeta.
// Con la lista al lado (`split`) no hay nada flotando: solo el margen del pin.
const zoneFit = (split: boolean) =>
  ({
    padding: split
      ? { top: 80, bottom: 40, left: 40, right: 40 }
      : { top: 120, bottom: 190, left: 50, right: 50 },
    maxZoom: 14,
  }) as const;

// `bounds`: el rectángulo de la zona que se mira; el mapa se encuadra en él al
// abrirse y cada vez que cambia `bounds` o `recenter`. `focus`: hay búsqueda o
// filtros activos, así que se encuadra sobre los resultados; sin ellos, vuelve
// a la zona. `onUserMove`: la persona ha movido el mapa (no cuando lo encuadra
// la web) y ha dejado de moverlo. `selected` es el local marcado (lo manda
// quien lo usa); sin `split`, al marcarlo se abre su vista previa, y con la
// lista al lado la tarjeta ya está en ella.
export function MapView({
  restaurants,
  bounds = null,
  recenter = 0,
  focus = false,
  followUser = false,
  split = false,
  selected,
  onSelect,
  highlighted = null,
  onHover,
  onUserMove,
}: {
  restaurants: Restaurant[];
  bounds?: Bounds | null;
  recenter?: number;
  focus?: boolean;
  // La zona es la de la persona (compartió su ubicación): el mapa se centra en
  // ella en vez de encuadrar toda la zona.
  followUser?: boolean;
  split?: boolean;
  selected: string | null;
  onSelect: (slug: string | null) => void;
  // El local que se resalta (su tarjeta tiene el ratón o el foco) y el aviso
  // de que la persona pasa el ratón o el foco por un marcador.
  highlighted?: string | null;
  onHover?: (slug: string | null) => void;
  onUserMove?: (move: MapMove) => void;
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
  // El rectángulo de la zona, para leerlo sin reiniciar el mapa al cambiar.
  const boundsRef = useRef(bounds);
  useEffect(() => {
    boundsRef.current = bounds;
  });
  const onUserMoveRef = useRef(onUserMove);
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef(onHover);
  const splitRef = useRef(split);
  useEffect(() => {
    onUserMoveRef.current = onUserMove;
    onSelectRef.current = onSelect;
    onHoverRef.current = onHover;
    splitRef.current = split;
  });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

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
          ...(boundsRef.current
            ? {
                bounds: boundsRef.current,
                fitBoundsOptions: zoneFit(splitRef.current),
              }
            : { center: worldView.center, zoom: worldView.zoom }),
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
        onSelectRef.current(null);
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

  // Avisar de lo que se ve cuando la persona mueve el mapa o cambia el zoom.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onMoveEnd = (e: { originalEvent?: unknown }) => {
      if (!e.originalEvent) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        const b = map.getBounds();
        const c = map.getCenter();
        onUserMoveRef.current?.({
          bbox: {
            west: b.getWest(),
            south: b.getSouth(),
            east: b.getEast(),
            north: b.getNorth(),
          },
          center: { lat: c.lat, lng: c.lng },
        });
      }, MOVE_DEBOUNCE_MS);
    };
    map.on('moveend', onMoveEnd);
    return () => {
      clearTimeout(timer);
      map.off('moveend', onMoveEnd);
    };
  }, [ready]);

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
      el.innerHTML = MARKER_SVG;
      el.addEventListener('click', () => onSelectRef.current(r.slug));
      for (const [event, slug] of [
        ['mouseenter', r.slug],
        ['focus', r.slug],
        ['mouseleave', null],
        ['blur', null],
      ] as const) {
        el.addEventListener(event, () => onHoverRef.current?.(slug));
      }
      const marker = new lib.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([r.location.lng, r.location.lat])
        .addTo(map);
      markers.current.set(r.slug, { marker, el });
    }
  }, [restaurants, t, ready]);

  // Encuadrar los resultados cuando hay búsqueda; volver a la zona si no.
  // Sin búsqueda, los resultados cambian al mover el mapa y no deben reencuadrar.
  const resultKey = focus ? restaurants.map((r) => r.slug).join(',') : '';
  const boundsKey = bounds ? bounds.flat().join(',') : '';
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
      const zone = boundsRef.current;
      if (zone) map.fitBounds(zone, { ...zoneFit(splitRef.current), duration });
      else
        map.easeTo({
          center: worldView.center,
          zoom: worldView.zoom,
          duration,
        });
      return;
    }
    if (restaurants.length === 0) return;
    const bounds = new lib.LngLatBounds();
    for (const r of restaurants)
      bounds.extend([r.location.lng, r.location.lat]);
    map.fitBounds(bounds, {
      padding: splitRef.current
        ? { top: 80, bottom: 40, left: 40, right: 40 }
        : { top: 70, bottom: 190, left: 50, right: 50 },
      maxZoom: 15,
      duration,
    });
    // `restaurants` entra por resultKey y la zona por boundsKey: solo reencuadra
    // si cambian los resultados o la zona.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultKey, boundsKey, recenter, focus, ready]);

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
    if (!followUser) return;
    map.easeTo({
      center: [position.lng, position.lat],
      zoom: 14,
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 0
        : 600,
    });
    // Va después del encuadre de la zona y depende de él: al cambiar de zona se
    // vuelve a centrar en la persona.
  }, [position, followUser, boundsKey, recenter, ready, t]);

  // Al cambiar el ancho de la zona del mapa (la lista aparece o desaparece).
  useEffect(() => {
    mapRef.current?.resize();
  }, [split, ready]);

  // El marcador del local seleccionado.
  useEffect(() => {
    markers.current.forEach(({ el }, slug) => {
      el.classList.toggle(styles.selected, slug === selected);
    });
  }, [selected, restaurants, ready]);

  // El marcador del local que se resalta desde su tarjeta.
  useEffect(() => {
    markers.current.forEach(({ el }, slug) => {
      const on = slug === highlighted;
      el.classList.toggle(styles.highlight, on);
      if (on) el.dataset.highlight = 'true';
      else delete el.dataset.highlight;
    });
  }, [highlighted, restaurants, ready]);

  // Foco en la vista previa.
  useEffect(() => {
    if (!selected || split) return;
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
  }, [selected, split]);

  const close = () => {
    const slug = selected;
    onSelect(null);
    if (slug) markers.current.get(slug)?.el.focus();
  };

  const current = split
    ? undefined
    : restaurants.find((r) => r.slug === selected);

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
          {t('map.loadError')} <Link href="/">{t('map.loadErrorLink')}</Link>
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
