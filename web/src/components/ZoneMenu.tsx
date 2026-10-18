'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useId, useMemo, useRef, useState } from 'react';
import { normalize } from '@/lib/search';
import type { RegionCountry, Zone } from '@/lib/types';
import { findCity } from '@/lib/zone';
import styles from './ZoneMenu.module.css';

// Pin (Material Icons, Apache-2.0).
const PIN_PATH =
  'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z';

// El país en el idioma de la interfaz (lo sabe el navegador).
function countryNamer(locale: string): (code: string) => string {
  try {
    const names = new Intl.DisplayNames([locale], { type: 'region' });
    return (code) => names.of(code) ?? code;
  } catch {
    return (code) => code;
  }
}

// Dónde se mira: la ciudad actual y, al pulsarla, un buscador de ciudades y
// países con locales (solo los hay donde hay algo que ver). Con una sola zona
// disponible no hay nada que elegir y queda una etiqueta.
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
  const locale = useLocale();
  const countryName = useMemo(() => countryNamer(locale), [locale]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const searchId = useId();
  const [text, setText] = useState('');

  const current = findCity(regions, zone);
  if (!current) return null;
  const currentLabel = `${current.name}, ${countryName(zone.country)}`;
  const single = regions.length === 1 && regions[0]!.cities.length === 1;

  const icon = (
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

  if (single) {
    return (
      <p className={styles.label} title={currentLabel}>
        {icon}
        <span className={styles.name}>{current.name}</span>
      </p>
    );
  }

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
            normalize(city.name).includes(q) ||
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
        aria-label={t('buttonLabel', { zone: currentLabel })}
        onClick={open}
      >
        {icon}
        <span className={styles.name}>{current.name}</span>
        <span aria-hidden="true" className={styles.chevron}>
          ▾
        </span>
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
                      country.code === zone.country && city.key === zone.city;
                    return (
                      <li key={city.key}>
                        <button
                          type="button"
                          className={styles.city}
                          aria-current={isCurrent ? 'true' : undefined}
                          onClick={() => {
                            onSelect({ country: country.code, city: city.key });
                            close();
                          }}
                        >
                          <span>{city.name}</span>
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
