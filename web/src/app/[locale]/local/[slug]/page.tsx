import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { RestaurantDetail } from '@/components/RestaurantDetail';
import { routing } from '@/i18n/routing';
import { getRestaurant, getRestaurants } from '@/lib/data';

export const dynamicParams = false;

export async function generateStaticParams() {
  const all = await getRestaurants();
  return routing.locales.flatMap((locale) =>
    all.map((r) => ({ locale, slug: r.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const r = await getRestaurant(slug);
  return { title: r ? `${r.name} · HeartEats` : 'HeartEats' };
}

export default async function LocalPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const restaurant = await getRestaurant(slug);
  if (!restaurant) notFound();
  return (
    <main id="contenido" tabIndex={-1}>
      <RestaurantDetail restaurant={restaurant} />
    </main>
  );
}
