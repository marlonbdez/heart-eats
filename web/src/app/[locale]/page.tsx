import { setRequestLocale } from 'next-intl/server';
import { MapLoader } from '@/components/MapLoader';
import { getRestaurants } from '@/lib/data';

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const restaurants = await getRestaurants();
  return (
    <main id="contenido" tabIndex={-1}>
      <MapLoader restaurants={restaurants} />
    </main>
  );
}
