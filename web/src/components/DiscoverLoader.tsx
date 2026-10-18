'use client';

import { getFoodTags } from '@/lib/data';
import { loadRegions } from '@/lib/regions';
import { useLoad } from '@/lib/use-load';
import { Discover } from './Discover';
import { Remote } from './Remote';

const loadBase = () => Promise.all([loadRegions(), getFoodTags()]);

// Inicio y lista: dónde hay locales y las categorías se piden a la API al
// abrir; los locales de la zona los pide Discover.
export function DiscoverLoader({ view }: { view?: 'map' | 'list' }) {
  const state = useLoad(loadBase);
  return (
    <Remote state={state}>
      {([regions, foodTags]) => (
        <Discover view={view} regions={regions} foodTags={foodTags} />
      )}
    </Remote>
  );
}
