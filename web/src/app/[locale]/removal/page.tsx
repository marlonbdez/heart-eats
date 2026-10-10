import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { RemovalForm } from '@/components/RemovalForm';
import { getPlaceOptions } from '../business/places';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'removal' });
  return { title: t('title') };
}

export default async function RemovalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const places = await getPlaceOptions(locale);
  return <RemovalForm places={places} />;
}
