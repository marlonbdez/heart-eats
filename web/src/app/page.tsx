import { redirect } from 'next/navigation';
import { routing } from '@/i18n/routing';

// La raíz lleva al idioma por defecto. En Netlify, netlify.toml redirige
// antes según el idioma del navegador.
export default function RootPage() {
  redirect(`/${routing.defaultLocale}`);
}
