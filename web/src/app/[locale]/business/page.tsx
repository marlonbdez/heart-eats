import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BusinessForm } from '@/components/BusinessForm';
import { getPlaceOptions } from './places';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'business' });
  return { title: t('title') };
}

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const places = await getPlaceOptions(locale);
  return <BusinessForm places={places} />;
}
