'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GalleryPhoto } from '@/lib/gallery';
import styles from './PlaceGallery.module.css';

// El visor vive en la dirección (#photos): así el botón Atrás del móvil lo
// cierra en vez de salir de la ficha.
const HASH = '#photos';

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Portada y mosaico de la ficha, y el visor a pantalla completa (un `<dialog>`
// nativo: bloquea el resto de la página, se cierra con Esc y devuelve el foco).
export function PlaceGallery({
  name,
  photos,
}: {
  name: string;
  photos: GalleryPhoto[];
}) {
  const t = useTranslations('detail.gallery');
  const total = photos.length;
  const dialog = useRef<HTMLDialogElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);
  const start = useRef(0);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(0);

  // Abrir con #photos en la dirección (por ejemplo, al recargar), y seguir los
  // cambios de la dirección: Atrás lo cierra, Adelante lo vuelve a abrir.
  useEffect(() => {
    const sync = () => setOpen(window.location.hash === HASH);
    sync();
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  const show = (index: number) => {
    start.current = index;
    setCurrent(index);
    if (window.location.hash !== HASH) {
      window.history.pushState(null, '', HASH);
      pushed.current = true;
    }
    setOpen(true);
  };

  const close = useCallback(() => {
    if (pushed.current) {
      pushed.current = false;
      window.history.back(); // popstate cierra el visor
    } else {
      const { pathname, search } = window.location;
      window.history.replaceState(null, '', pathname + search);
      setOpen(false);
    }
  }, []);

  // El estado manda sobre el diálogo nativo.
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      document.body.style.overflow = 'hidden';
      const view = track.current;
      if (view) view.scrollLeft = start.current * view.clientWidth;
      setCurrent(start.current);
      view?.focus();
    } else if (!open && el.open) {
      el.close();
    }
    if (!open) document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const go = (index: number) => {
    const view = track.current;
    if (!view) return;
    const next = Math.min(total - 1, Math.max(0, index));
    view.scrollTo({
      left: next * view.clientWidth,
      behavior: reducedMotion() ? 'auto' : 'smooth',
    });
  };

  const onScroll = () => {
    const view = track.current;
    if (!view || view.clientWidth === 0) return;
    setCurrent(Math.round(view.scrollLeft / view.clientWidth));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const keys: Record<string, number> = {
      ArrowLeft: current - 1,
      ArrowRight: current + 1,
      Home: 0,
      End: total - 1,
    };
    if (e.key in keys) {
      e.preventDefault();
      go(keys[e.key]!);
    }
  };

  const altOf = (photo: GalleryPhoto, i: number) =>
    photo.alt ?? t('photoOf', { n: i + 1, name });

  const side = photos.slice(1, 3);
  const layout =
    total >= 3 ? styles.three : total === 2 ? styles.two : styles.one;

  return (
    <>
      <div className={`${styles.mosaic} ${layout}`}>
        <button
          type="button"
          className={`${styles.tile} ${styles.cover}`}
          aria-label={t('open', { name })}
          onClick={() => show(0)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos[0]!.url} alt="" decoding="async" />
        </button>
        {side.map((photo, i) => (
          <button
            key={photo.url}
            type="button"
            className={`${styles.tile} ${styles.side}`}
            aria-label={t('open', { name })}
            onClick={() => show(i + 1)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.thumbUrl} alt="" loading="lazy" decoding="async" />
          </button>
        ))}
        {total > 1 && (
          <button type="button" className={styles.pill} onClick={() => show(0)}>
            <span aria-hidden="true">▦ </span>
            {t('seeAll', { count: total })}
          </button>
        )}
      </div>

      <dialog
        ref={dialog}
        className={styles.viewer}
        aria-label={t('label', { name })}
        onClose={() => {
          // Esc cierra el diálogo por su cuenta: la dirección se pone al día.
          if (window.location.hash === HASH) close();
        }}
      >
        <div className={styles.bar}>
          <p className={styles.counter} aria-live="polite">
            <span aria-hidden="true">
              {t('counter', { n: current + 1, total })}
            </span>
            <span className={styles.srOnly}>
              {t('slide', { n: current + 1, total })}
            </span>
          </p>
          <button type="button" className={styles.close} onClick={close}>
            <span aria-hidden="true">✕</span>
            <span className={styles.srOnly}>{t('close')}</span>
          </button>
        </div>
        <div
          ref={track}
          className={styles.track}
          role="group"
          aria-roledescription="carousel"
          aria-label={t('label', { name })}
          tabIndex={0}
          onScroll={onScroll}
          onKeyDown={onKeyDown}
        >
          {photos.map((photo, i) => (
            <div
              key={photo.url}
              className={styles.slide}
              role="group"
              aria-roledescription="slide"
              aria-label={t('slide', { n: i + 1, total })}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={altOf(photo, i)}
                loading={i < 2 ? 'eager' : 'lazy'}
                decoding="async"
              />
            </div>
          ))}
        </div>
        {total > 1 && (
          <div className={styles.arrows}>
            <button
              type="button"
              disabled={current === 0}
              onClick={() => go(current - 1)}
            >
              <span aria-hidden="true">‹</span>
              <span className={styles.srOnly}>{t('previous')}</span>
            </button>
            <button
              type="button"
              disabled={current === total - 1}
              onClick={() => go(current + 1)}
            >
              <span aria-hidden="true">›</span>
              <span className={styles.srOnly}>{t('next')}</span>
            </button>
          </div>
        )}
      </dialog>
    </>
  );
}
