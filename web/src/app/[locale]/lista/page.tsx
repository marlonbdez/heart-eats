import { setRequestLocale } from 'next-intl/server';
import { Discover } from '@/components/Discover';
import { getFoodTags, getRestaurants } from '@/lib/data';

export default async function ListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [restaurants, foodTags] = await Promise.all([
    getRestaurants(),
    getFoodTags(),
  ]);
  return (
    <main id="contenido" tabIndex={-1}>
      <Discover view="list" restaurants={restaurants} foodTags={foodTags} />
    </main>
  );
}
