'use client';

import type { Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';
import { es } from '@/lib/i18n/es';
import { defaultView, mapStyles } from '@/lib/map-config';
import type { Restaurant } from '@/lib/types';
import { RestaurantCard } from './RestaurantCard';
import styles from './MapView.module.css';

const HEART_PATH =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

export function MapView({ restaurants }: { restaurants: Restaurant[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const markerEls = useRef(new Map<string, HTMLButtonElement>());
  const [selected, setSelected] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | undefined;
    const els = markerEls.current;
    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const styleUrl = () =>
      colorScheme.matches ? mapStyles.dark : mapStyles.light;
    const onSchemeChange = () => map?.setStyle(styleUrl());

    (async () => {
      const { Map, Marker, NavigationControl, setWorkerUrl } =
        await import('maplibre-gl');
      // Ver scripts/copy-maplibre-worker.mjs
      setWorkerUrl(`${window.location.origin}/maplibre/maplibre-gl-worker.mjs`);
      if (cancelled || !containerRef.current) return;
      try {
        map = new Map({
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
        new NavigationControl({ showCompass: false }),
        'top-right',
      );
      colorScheme.addEventListener('change', onSchemeChange);

      // Un clic en el fondo cierra la vista previa (no en un marcador).
      map.on('click', (e) => {
        const target = e.originalEvent.target as HTMLElement | null;
        if (target?.closest('[data-marker]')) return;
        setSelected(null);
      });

      for (const r of restaurants) {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = styles.marker;
        el.dataset.marker = r.slug;
        el.setAttribute('aria-label', es.map.markerLabel(r.name));
        el.innerHTML = `<svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true" focusable="false"><path d="${HEART_PATH}"/></svg>`;
        el.addEventListener('click', () => setSelected(r.slug));
        els.set(r.slug, el);
        new Marker({ element: el, anchor: 'bottom' })
          .setLngLat([r.location.lng, r.location.lat])
          .addTo(map);
      }
    })();

    return () => {
      cancelled = true;
      colorScheme.removeEventListener('change', onSchemeChange);
      map?.remove();
      els.clear();
    };
  }, [restaurants]);

  // Marcador seleccionado y foco en la tarjeta.
  useEffect(() => {
    markerEls.current.forEach((el, slug) => {
      el.classList.toggle(styles.selected, slug === selected);
    });
    if (selected) cardRef.current?.focus();
  }, [selected]);

  const close = () => {
    const slug = selected;
    setSelected(null);
    if (slug) markerEls.current.get(slug)?.focus();
  };

  const current = restaurants.find((r) => r.slug === selected);

  return (
    <div className={styles.wrap}>
      <div
        ref={containerRef}
        className={styles.map}
        role="region"
        aria-label={es.map.label}
      />
      {failed && (
        <p role="alert" className={styles.error}>
          {es.map.loadError}
        </p>
      )}
      {current && (
        <aside
          ref={cardRef}
          className={styles.preview}
          aria-label={es.card.label}
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === 'Escape') close();
          }}
        >
          <button
            type="button"
            className={styles.close}
            aria-label={es.card.close}
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
