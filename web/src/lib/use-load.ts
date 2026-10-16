'use client';

import { useCallback, useEffect, useState } from 'react';

export type Loaded<T> =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; data: T };

// Carga datos de la API en el navegador. Los argumentos tienen que poder
// serializarse: cuando cambian, vuelve a cargar. `retry` repite tras un fallo.
export function useLoad<T, A extends unknown[]>(
  load: (...args: A) => Promise<T>,
  ...args: A
): Loaded<T> {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<
    { id: string; data: T } | { id: string; failed: true }
  >();
  const argsKey = JSON.stringify(args);
  const id = `${argsKey}#${attempt}`;

  useEffect(() => {
    let live = true;
    load(...(JSON.parse(argsKey) as A)).then(
      (data) => live && setResult({ id, data }),
      () => live && setResult({ id, failed: true }),
    );
    return () => {
      live = false;
    };
  }, [load, argsKey, id]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  if (result?.id !== id) return { status: 'loading' };
  if ('failed' in result) return { status: 'error', retry };
  return { status: 'ready', data: result.data };
}
