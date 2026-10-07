import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ProposeForm } from '@/components/ProposeForm';
import { getFoodTags } from '@/lib/data';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'propose' });
  return { title: t('title') };
}

export default async function ProposePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const foodTags = await getFoodTags();
  return <ProposeForm foodTags={foodTags} />;
}
