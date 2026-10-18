import type { Metadata } from 'next';
import { RootRedirect } from '@/components/RootRedirect';

// Provisional: la web está cerrada a buscadores hasta el lanzamiento.
export const metadata: Metadata = {
  title: 'HeartEats',
  robots: { index: false, follow: false },
};

// Fuera de un idioma no hay layout con <html>: lo pone esta página.
export default function RootPage() {
  return (
    <html lang="en">
      <body>
        <RootRedirect />
      </body>
    </html>
  );
}
