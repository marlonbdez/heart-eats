'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useId, useMemo, useRef, useState } from 'react';
import { normalize } from '@/lib/search';
import type { RegionCountry, Zone } from '@/lib/types';
import { cityLabel, cityNames, findCity } from '@/lib/zone';
import { useLocation } from './LocationProvider';
import { Spinner } from './Spinner';
import { Chevron } from './Chevron';
import styles from './ZoneMenu.module.css';

// Pin (Material Icons, Apache-2.0).
const PIN_PATH =
  'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z';

// Mirilla (la misma del botón del mapa).
const CROSSHAIR_PATH = 'M12 2v4M12 18v4M2 12h4M18 12h4';

// El país en el idioma de la interfaz (lo sabe el navegador).
function countryNamer(locale: string): (code: string) => string {
  try {
    const names = new Intl.DisplayNames([locale], { type: 'region' });
    return (code) => names.of(code) ?? code;
  } catch {
    return (code) => code;
  }
}

// Dónde se mira: la ciudad actual (o «Cerca de mí», si la persona compartió su
// ubicación) y, al pulsarla, «Cerca de mí» y un buscador de ciudades y países
// con locales (solo los hay donde hay algo que ver).
export function ZoneMenu({
  regions,
  zone,
  onSelect,
}: {
  regions: RegionCountry[];
  zone: Zone;
  onSelect: (zone: Zone) => void;
}) {
  const t = useTranslations('zone');
  const tNear = useTranslations('nearMe');
  const locale = useLocale();
  const { status, request, clear } = useLocation();
  const countryName = useMemo(() => countryNamer(locale), [locale]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const searchId = useId();
  const [text, setText] = useState('');

  const current = findCity(regions, zone);
  if (!current) return null;
  const currentCity = cityLabel(current, locale);
  const currentLabel = `${currentCity}, ${countryName(zone.country)}`;
  const nearActive = status === 'granted';
  const asking = status === 'asking';

  const pin = (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      focusable="false"
      className={styles.icon}
    >
      <path d={PIN_PATH} />
    </svg>
  );
  const crosshair = (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
      className={styles.crosshair}
    >
      <circle cx="12" cy="12" r="7" />
      <path d={CROSSHAIR_PATH} />
    </svg>
  );
  // Mientras busca, una rueda; con la ubicación compartida, la mirilla.
  const icon = asking ? (
    <Spinner />
  ) : nearActive ? (
    <span className={styles.icon}>{crosshair}</span>
  ) : (
    pin
  );
  const shownName = nearActive ? tNear('button') : currentCity;

  const q = normalize(text);
  const groups = regions
    .map((country) => {
      const name = countryName(country.code);
      const countryMatches =
        !q || normalize(name).includes(q) || country.code.toLowerCase() === q;
      return {
        country,
        name,
        cities: country.cities.filter(
          (city) =>
            countryMatches ||
            cityNames(city).some((n) => normalize(n).includes(q)) ||
            city.key.includes(q),
        ),
      };
    })
    .filter((group) => group.cities.length > 0);

  const open = () => {
    setText('');
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        className={styles.button}
        aria-haspopup="dialog"
        aria-label={t('buttonLabel', {
          zone: nearActive ? tNear('button') : currentLabel,
        })}
        aria-busy={asking}
        onClick={open}
      >
        {icon}
        <span className={styles.name}>{shownName}</span>
        <Chevron className={styles.chevron} />
      </button>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={titleId}
        onClick={(e) => {
          // Un clic sobre el propio <dialog> (no sobre su contenido) es el fondo.
          if (e.target === dialogRef.current) close();
        }}
      >
        <div className={styles.head}>
          <h2 id={titleId} className={styles.title}>
            {t('title')}
          </h2>
          <button
            type="button"
            className={styles.close}
            aria-label={t('close')}
            onClick={close}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <label htmlFor={searchId} className={styles.searchLabel}>
          {t('searchLabel')}
        </label>
        <input
          id={searchId}
          type="search"
          className={styles.search}
          placeholder={t('searchPlaceholder')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
        />
        {!q && (
          <button
            type="button"
            className={styles.nearMe}
            aria-current={nearActive ? 'true' : undefined}
            disabled={asking}
            onClick={() => {
              if (!nearActive) request();
              close();
            }}
          >
            {crosshair}
            <span>{tNear('button')}</span>
          </button>
        )}
        {groups.length === 0 ? (
          <p role="status" className={styles.none}>
            {t('none')}
          </p>
        ) : (
          <div className={styles.groups}>
            {groups.map(({ country, name, cities }) => (
              <section key={country.code}>
                <h3 className={styles.country}>{name}</h3>
                <ul className={styles.cities}>
                  {cities.map((city) => {
                    const isCurrent =
                      !nearActive &&
                      country.code === zone.country &&
                      city.key === zone.city;
                    return (
                      <li key={city.key}>
                        <button
                          type="button"
                          className={styles.city}
                          aria-current={isCurrent ? 'true' : undefined}
                          onClick={() => {
                            // Elegir una ciudad deja de lado la ubicación.
                            if (status !== 'idle') clear();
                            onSelect({ country: country.code, city: city.key });
                            close();
                          }}
                        >
                          <span>{cityLabel(city, locale)}</span>
                          <span className={styles.count}>
                            {t('count', { count: city.count })}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </dialog>
    </>
  );
}
