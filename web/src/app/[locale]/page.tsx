import { setRequestLocale } from 'next-intl/server';
import { DiscoverLoader } from '@/components/DiscoverLoader';

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main id="contenido" tabIndex={-1}>
      <DiscoverLoader />
    </main>
  );
}
