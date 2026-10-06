import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HeartEats',
  description:
    'Descubre y apoya negocios gastronómicos con equipos inclusivos.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
