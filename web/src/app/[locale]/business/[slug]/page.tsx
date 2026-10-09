import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BusinessForm } from '@/components/BusinessForm';
import { routing } from '@/i18n/routing';
import { getRestaurants } from '@/lib/data';
import { getPlaceOptions } from '../places';

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
  const t = await getTranslations({ locale, namespace: 'business' });
  return { title: t('title') };
}

// Se llega desde la ficha de un local, que ya queda elegido en el formulario.
export default async function BusinessPlacePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const places = await getPlaceOptions(locale);
  if (!places.some((p) => p.slug === slug)) notFound();
  return <BusinessForm places={places} initialSlug={slug} />;
}
