import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModerationPanel } from '@/components/ModerationPanel';
import { getModerationQueue } from '@/lib/data';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'moderation' });
  return { title: t('title') };
}

// No está en el menú público: más adelante se entrará con un enlace mágico.
export default async function ModerationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const items = await getModerationQueue();
  return <ModerationPanel items={items} />;
}
