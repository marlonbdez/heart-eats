'use client';

import { getFoodTags } from '@/lib/data';
import { useLoad } from '@/lib/use-load';
import { ProposeForm } from './ProposeForm';
import { Remote } from './Remote';

// «Proponer un local»: las categorías de comida vienen de la API.
export function ProposeLoader() {
  const state = useLoad(getFoodTags);
  return (
    <Remote state={state}>
      {(foodTags) => <ProposeForm foodTags={foodTags} />}
    </Remote>
  );
}
