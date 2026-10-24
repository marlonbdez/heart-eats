'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import { getRestaurant } from '@/lib/data';
import type { Restaurant } from '@/lib/types';
import { useLoad } from '@/lib/use-load';
import { useSlug } from '@/lib/use-slug';
import { BusinessForm } from './BusinessForm';
import { CorrectForm } from './CorrectForm';
import { toPlaceOption } from './PlacePicker';
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

// Desde la ficha (/business/<slug>) el local ya está elegido, esté donde esté;
// sin ficha, el formulario lo busca por país y nombre.
export function BusinessLoader({ fromAddress }: { fromAddress?: boolean }) {
  return fromAddress ? <BusinessFromPlace /> : <BusinessForm />;
}

function BusinessFromPlace() {
  const state = useRestaurant();
  return (
    <Remote state={state}>
      {(restaurant) =>
        restaurant ? (
          <BusinessForm initialPlace={toPlaceOption(restaurant)} />
        ) : (
          <Missing />
        )
      }
    </Remote>
  );
}
