'use client';

import type { Map as MapLibreMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { countryView } from '@/lib/country-views';
import { MARKER_SVG } from '@/lib/marker';
import { mapStyles, worldView } from '@/lib/map-config';
import type { LatLng } from '@/lib/types';
import form from './Form.module.css';
import styles from './PinPicker.module.css';

type MapLibre = typeof import('maplibre-gl');

// Cuánto se acerca el mapa al abrirlo sobre un pin ya puesto.
const PIN_ZOOM = 16;

// Mapa donde quien propone un local coloca su pin (opcional). Se puede tocar
// el sitio, o llevar el mapa hasta él (con los dedos o con las flechas y +/-
// del teclado) y poner el pin en el centro: así no hace falta arrastrar nada.
export function PinPicker({
  country,
  value,
  onChange,
}: {
  country: string;
  value: LatLng | null;
  onChange: (value: LatLng | null) => void;
}) {
  const t = useTranslations('propose.s1.pin');
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const libRef = useRef<MapLibre | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Lo último que llegó por props, para leerlo desde los eventos del mapa.
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const countryRef = useRef(country);
  useEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
    countryRef.current = country;
  });

  // Crear el mapa una sola vez, centrado en el pin o, si no hay, en el país.
  useEffect(() => {
    let cancelled = false;
    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const styleUrl = () =>
      colorScheme.matches ? mapStyles.dark : mapStyles.light;
    const onSchemeChange = () => mapRef.current?.setStyle(styleUrl());

    (async () => {
      const lib = await import('maplibre-gl');
      lib.setWorkerUrl(
        `${window.location.origin}/maplibre/maplibre-gl-worker.mjs`,
      );
      if (cancelled || !containerRef.current) return;
      const pin = valueRef.current;
      const view = countryView(countryRef.current);
      let map: MapLibreMap;
      try {
        map = new lib.Map({
          container: containerRef.current,
          style: styleUrl(),
          center: pin
            ? [pin.lng, pin.lat]
            : view
              ? [view.lng, view.lat]
              : worldView.center,
          zoom: pin ? PIN_ZOOM : (view?.zoom ?? worldView.zoom),
        });
      } catch {
        setFailed(true);
        return;
      }
      map.addControl(
        new lib.NavigationControl({ showCompass: false }),
        'top-right',
      );
      map.getCanvas().setAttribute('aria-label', t('mapLabel'));
      colorScheme.addEventListener('change', onSchemeChange);
      map.on('click', (e) =>
        onChangeRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng }),
      );
      mapRef.current = map;
      libRef.current = lib;
      setReady(true);
    })();

    return () => {
      cancelled = true;
      colorScheme.removeEventListener('change', onSchemeChange);
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      setReady(false);
    };
    // El mapa se crea una vez; el texto del lector se lee al crearlo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dibujar el pin donde está el valor.
  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!ready || !map || !lib) return;
    if (!value) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) {
      const el = document.createElement('div');
      el.className = styles.pin;
      el.innerHTML = MARKER_SVG;
      markerRef.current = new lib.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([value.lng, value.lat])
        .addTo(map);
    } else {
      markerRef.current.setLngLat([value.lng, value.lat]);
    }
  }, [value, ready]);

  // Si cambia el país y no hay pin, el mapa va al nuevo país.
  const firstCountry = useRef(true);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    if (firstCountry.current) {
      firstCountry.current = false;
      return;
    }
    const view = countryView(country);
    if (!view || valueRef.current) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    map.easeTo({
      center: [view.lng, view.lat],
      zoom: view.zoom,
      duration: reduced.matches ? 0 : 600,
    });
  }, [country, ready]);

  const placeAtCenter = () => {
    const c = mapRef.current?.getCenter();
    if (c) onChange({ lat: c.lat, lng: c.lng });
  };

  if (failed) {
    return (
      <p role="status" className={form.note}>
        {t('failed')}
      </p>
    );
  }

  return (
    <div className={styles.picker}>
      <div className={styles.frame}>
        <div ref={containerRef} className={styles.map} />
        <span className={styles.cross} aria-hidden="true" />
      </div>
      <p className={form.small}>{t('how')}</p>
      <div className={styles.actions}>
        <button
          type="button"
          className={`${form.btn} ${form.secondary}`}
          onClick={placeAtCenter}
          disabled={!ready}
        >
          {t('placeCenter')}
        </button>
        {value && (
          <button
            type="button"
            className={form.linkButton}
            onClick={() => onChange(null)}
          >
            {t('remove')}
          </button>
        )}
      </div>
      <p role="status" className={form.small}>
        {value
          ? t('placed', {
              lat: value.lat.toFixed(5),
              lng: value.lng.toFixed(5),
            })
          : t('notPlaced')}
      </p>
    </div>
  );
}
