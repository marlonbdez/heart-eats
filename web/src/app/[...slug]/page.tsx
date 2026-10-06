import Link from 'next/link';
import { es } from '@/lib/i18n/es';
import { pendingRoutes } from '@/lib/nav';

export const dynamicParams = false;

export function generateStaticParams() {
  return pendingRoutes.map((slug) => ({ slug: [slug] }));
}

export default function ComingSoon() {
  return (
    <main id="contenido" tabIndex={-1} style={{ padding: 24, maxWidth: 560 }}>
      <h1>{es.placeholder.title}</h1>
      <p>{es.placeholder.body}</p>
      <p>
        <Link href="/">{es.placeholder.back}</Link>
      </p>
    </main>
  );
}
