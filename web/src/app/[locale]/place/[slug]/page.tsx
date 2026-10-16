import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { PlaceLoader } from '@/components/LocalLoaders';
import { routing } from '@/i18n/routing';

export const dynamicParams = false;

// Solo se genera una página por idioma: el servidor reescribe cualquier
// dirección con slug a esta (netlify.toml) y el local se pide a la API.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale, slug: '_' }));
}

// El nombre del local solo se conoce en el navegador: PlaceLoader pone el título.
export const metadata: Metadata = { title: 'HeartEats' };

export default async function LocalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main id="contenido" tabIndex={-1}>
      <PlaceLoader />
    </main>
  );
}
