'use client';

import { getFoodTags, getRestaurants } from '@/lib/data';
import { useLoad } from '@/lib/use-load';
import { Discover } from './Discover';
import { Remote } from './Remote';

const loadAll = () => Promise.all([getRestaurants(), getFoodTags()]);

// Inicio y lista: los locales y las categorías se piden a la API al abrir.
export function DiscoverLoader({ view }: { view?: 'map' | 'list' }) {
  const state = useLoad(loadAll);
  return (
    <Remote state={state}>
      {([restaurants, foodTags]) => (
        <Discover view={view} restaurants={restaurants} foodTags={foodTags} />
      )}
    </Remote>
  );
}
