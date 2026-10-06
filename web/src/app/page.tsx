import { MapLoader } from '@/components/MapLoader';
import { getRestaurants } from '@/lib/data';

export default async function Home() {
  const restaurants = await getRestaurants();
  return (
    <main id="contenido" tabIndex={-1}>
      <MapLoader restaurants={restaurants} />
    </main>
  );
}
