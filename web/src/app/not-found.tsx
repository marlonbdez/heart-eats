import Link from 'next/link';
import './globals.css';

// 404 fuera de un idioma (p. ej. /fr). Bilingüe porque aquí no hay idioma.
export default function NotFound() {
  return (
    <html lang="es">
      <body>
        <main style={{ padding: 24, maxWidth: 560 }}>
          <h1>No encontramos esta página · We could not find this page</h1>
          <p>
            <Link href="/es">Volver al inicio</Link> ·{' '}
            <Link href="/en">Back to home</Link>
          </p>
        </main>
      </body>
    </html>
  );
}
