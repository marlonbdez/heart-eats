import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CorrectForm } from '@/components/CorrectForm';
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
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'correct' });
  return { title: t('title') };
}

export default async function CorrectPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const restaurant = await getRestaurant(slug);
  if (!restaurant) notFound();
  return <CorrectForm slug={restaurant.slug} placeName={restaurant.name} />;
}
