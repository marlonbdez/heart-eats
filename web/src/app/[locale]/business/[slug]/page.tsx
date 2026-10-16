import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BusinessLoader } from '@/components/LocalLoaders';
import { routing } from '@/i18n/routing';

export const dynamicParams = false;

// Solo se genera una página por idioma: el servidor reescribe cualquier
// dirección con slug a esta (netlify.toml) y el local se pide a la API.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale, slug: '_' }));
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
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <BusinessLoader fromAddress />;
}
