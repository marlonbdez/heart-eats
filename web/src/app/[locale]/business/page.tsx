import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BusinessForm } from '@/components/BusinessForm';
import { getRestaurants } from '@/lib/data';

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
  const all = await getRestaurants();
  const places = all
    .map((r) => ({
      slug: r.slug,
      name: r.name,
      neighborhood: r.address.neighborhood,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
  return <BusinessForm places={places} />;
}
