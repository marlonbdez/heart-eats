'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { countryName } from '@/lib/countries';
import { PLACE_SEARCH_LIMIT, searchPlaces } from '@/lib/data';
import { loadRegions } from '@/lib/regions';
import type { RegionCountry, Restaurant } from '@/lib/types';
import { useLoad } from '@/lib/use-load';
import { Remote } from './Remote';
import { Spinner } from './Spinner';
import s from './Form.module.css';
import styles from './PlacePicker.module.css';

const MIN_QUERY = 2;
const DEBOUNCE_MS = 300;

export interface PlaceOption {
  slug: string;
  name: string;
  street: string;
  city: string;
}

export const toPlaceOption = (r: Restaurant): PlaceOption => ({
  slug: r.slug,
  name: r.name,
  street: r.address.street,
  city: r.address.city,
});

// Fuera de la función del componente para que `useLoad` la vea siempre igual.
function findByName(country: string, q: string) {
  return q.length < MIN_QUERY
    ? Promise.resolve(null)
    : searchPlaces(country, q);
}

interface Props {
  id: string;
  label: string;
  value: PlaceOption | null;
  onChange: (place: PlaceOption | null) => void;
  error?: string;
}

// Elegir un local publicado, esté donde esté: se escoge el país y se busca por
// el nombre (la API nunca devuelve «todos»). No es un formulario propio porque
// va dentro de los de varios pasos.
export function PlacePicker(props: Props) {
  const regions = useLoad(loadRegions);
  return (
    <Remote state={regions}>
      {(countries) => <Picker countries={countries} {...props} />}
    </Remote>
  );
}

function Picker({
  countries,
  id,
  label,
  value,
  onChange,
  error,
}: Props & { countries: RegionCountry[] }) {
  const t = useTranslations('placePicker');
  const locale = useLocale();
  const [country, setCountry] = useState(countries[0]?.code ?? '');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const changeRef = useRef<HTMLButtonElement>(null);
  // El foco sigue a la persona: al elegir va a «Cambiar de local» y al
  // cambiar, de vuelta al buscador (el botón pulsado deja de existir).
  const focusAfter = useRef<'change' | 'search' | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(q.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    if (focusAfter.current === 'change') changeRef.current?.focus();
    if (focusAfter.current === 'search') searchRef.current?.focus();
    focusAfter.current = null;
  }, [value]);

  const found = useLoad(findByName, country, query);

  if (countries.length === 0) {
    return <p className={s.small}>{t('noRegions')}</p>;
  }

  if (value) {
    return (
      <div role="group" aria-labelledby={`${id}-label`} className={s.field}>
        <p id={`${id}-label`} className={`${s.label} ${styles.chosenLabel}`}>
          {label}
        </p>
        <div className={s.card}>
          <p className={`${s.summary} ${styles.chosen}`}>
            <strong>{value.name}</strong>
            <br />
            <span>
              {value.street} · {value.city}
            </span>
          </p>
          <button
            ref={changeRef}
            type="button"
            className={`${s.linkButton} ${styles.change}`}
            onClick={() => {
              focusAfter.current = 'search';
              onChange(null);
            }}
          >
            {t('change')}
          </button>
        </div>
      </div>
    );
  }

  const describedBy = [`${id}-hint`, error && `${id}-error`]
    .filter(Boolean)
    .join(' ');
  // Solo se enseña lo que corresponde a lo que está escrito ahora.
  const typed = q.trim();
  const settled = typed === query;
  const items = found.status === 'ready' && settled ? found.data : null;
  const waiting =
    typed.length >= MIN_QUERY && (!settled || found.status === 'loading');

  return (
    <div className={s.field}>
      {countries.length > 1 && (
        <>
          <label htmlFor={`${id}-country`} className={s.label}>
            {t('country')}
          </label>
          <select
            id={`${id}-country`}
            className={s.input}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {countryName(c.code, locale)}
              </option>
            ))}
          </select>
        </>
      )}
      <label htmlFor={id} className={s.label}>
        {label}
      </label>
      <input
        ref={searchRef}
        id={id}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        maxLength={100}
        className={`${s.input} ${error ? s.invalid : ''}`}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        // Dentro de un formulario, Intro busca al momento en vez de avanzar.
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          setQuery(q.trim());
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      <p id={`${id}-hint`} className={s.small}>
        {t('hint')}
      </p>
      {error && (
        <p id={`${id}-error`} role="alert" className={s.error}>
          {error}
        </p>
      )}
      <div role="status" className={s.small}>
        {waiting && (
          <span className={styles.searching}>
            <Spinner /> {t('searching')}
          </span>
        )}
        {!waiting && items?.length === 0 && t('noResults')}
        {!waiting &&
          items &&
          items.length > 0 &&
          t('found', { count: items.length })}
      </div>
      {found.status === 'error' && (
        <div role="alert">
          <p className={s.error}>{t('error')}</p>
          <button type="button" className={s.linkButton} onClick={found.retry}>
            {t('retry')}
          </button>
        </div>
      )}
      {!waiting && items && items.length > 0 && (
        <>
          <ul className={styles.results}>
            {items.map((r) => (
              <li key={r.slug}>
                <button
                  type="button"
                  className={styles.result}
                  onClick={() => {
                    focusAfter.current = 'change';
                    onChange(toPlaceOption(r));
                  }}
                >
                  <span className={styles.name}>{r.name}</span>
                  <span className={styles.meta}>
                    {r.address.street} · {r.address.city}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {items.length >= PLACE_SEARCH_LIMIT && (
            <p className={s.small}>{t('more')}</p>
          )}
        </>
      )}
    </div>
  );
}
