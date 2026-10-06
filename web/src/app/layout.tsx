import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import './globals.css';

export const metadata: Metadata = {
  title: 'HeartEats',
  description:
    'Descubre y apoya negocios gastronómicos con equipos inclusivos.',
  // Provisional: la web muestra datos de ejemplo. Quitar al lanzar con datos reales.
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
