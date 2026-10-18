'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import { getRestaurant } from '@/lib/data';
import { loadDefaultZoneRestaurants } from '@/lib/regions';
import type { Restaurant } from '@/lib/types';
import { useLoad } from '@/lib/use-load';
import { useSlug } from '@/lib/use-slug';
import { BusinessForm, type PlaceOption } from './BusinessForm';
import { CorrectForm } from './CorrectForm';
import { RemovalForm } from './RemovalForm';
import { Remote } from './Remote';
import { RestaurantDetail } from './RestaurantDetail';
import styles from './Remote.module.css';

// El local de la dirección (/place/<slug>), o un aviso si no existe.
function useRestaurant() {
  const slug = useSlug();
  const state = useLoad(
    (s: string | null) => (s ? getRestaurant(s) : Promise.resolve(null)),
    slug,
  );
  return slug ? state : ({ status: 'loading' } as const);
}

function Missing() {
  const t = useTranslations('load');
  return (
    <div role="alert" className={styles.note}>
      <h1>{t('missingTitle')}</h1>
      <p>{t('missingBody')}</p>
      <Link href="/">{t('missingBack')}</Link>
    </div>
  );
}

function WithRestaurant({
  children,
}: {
  children: (restaurant: Restaurant) => React.ReactNode;
}) {
  const state = useRestaurant();
  useEffect(() => {
    if (state.status === 'ready' && state.data) {
      document.title = `${state.data.name} · HeartEats`;
    }
  }, [state]);
  return (
    <Remote state={state}>
      {(restaurant) => (restaurant ? children(restaurant) : <Missing />)}
    </Remote>
  );
}

export function PlaceLoader() {
  return (
    <WithRestaurant>
      {(restaurant) => <RestaurantDetail restaurant={restaurant} />}
    </WithRestaurant>
  );
}

export function CorrectLoader() {
  return (
    <WithRestaurant>
      {(restaurant) => (
        <CorrectForm slug={restaurant.slug} placeName={restaurant.name} />
      )}
    </WithRestaurant>
  );
}

// Los locales entre los que el negocio elige el suyo, por orden alfabético.
export function toPlaceOptions(
  all: Restaurant[],
  locale: string,
): PlaceOption[] {
  return all
    .map((r) => ({
      slug: r.slug,
      name: r.name,
      neighborhood: r.address.neighborhood,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

// Desde la ficha (/business/<slug>) basta el propio local, esté donde esté;
// sin local, se elige de la lista de la zona por defecto.
export function BusinessLoader({ fromAddress }: { fromAddress?: boolean }) {
  const locale = useLocale();
  const slug = useSlug();
  const state = useLoad(
    (s: string | null) =>
      fromAddress
        ? s
          ? getRestaurant(s).then((r) => (r ? [r] : []))
          : Promise.resolve([])
        : loadDefaultZoneRestaurants(),
    slug,
  );
  const initial = fromAddress ? slug : null;
  return (
    <Remote
      state={fromAddress && !slug ? ({ status: 'loading' } as const) : state}
    >
      {(all) => {
        const places = toPlaceOptions(all, locale);
        if (fromAddress && !places.some((p) => p.slug === initial)) {
          return <Missing />;
        }
        return (
          <BusinessForm places={places} initialSlug={initial ?? undefined} />
        );
      }}
    </Remote>
  );
}

export function RemovalLoader() {
  const locale = useLocale();
  const state = useLoad(loadDefaultZoneRestaurants);
  return (
    <Remote state={state}>
      {(all) => <RemovalForm places={toPlaceOptions(all, locale)} />}
    </Remote>
  );
}
