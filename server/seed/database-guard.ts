// Freno de los scripts de datos de ejemplo: solo cargan o borran en una base
// local o de staging (nombre terminado en `_staging`). En cualquier otra, la
// de producción incluida, se niegan salvo que se pase --production a propósito.
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export function isSafeForDemoData(uri: string): boolean {
  try {
    const url = new URL(uri.replace(/^mongodb(\+srv)?:/, 'http:'));
    const name = url.pathname.replace(/^\//, '');
    return LOCAL_HOSTS.has(url.hostname) || name.endsWith('_staging');
  } catch {
    return false;
  }
}

export function requireSafeDatabase(
  uri: string,
  argv: string[] = process.argv,
): void {
  if (isSafeForDemoData(uri) || argv.includes('--production')) return;
  console.error(
    'Esta base de datos no es local ni de staging (su nombre no termina en _staging),\n' +
      'así que no se carga ni se borra nada: los datos de ejemplo no van a producción.\n' +
      'Si es lo que quieres de verdad, repite el comando con --production.',
  );
  process.exit(1);
}
