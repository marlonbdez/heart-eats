'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SlowNotice } from './SlowNotice';
import styles from './NavigationProgress.module.css';

// Margen antes de enseñar la barra: una navegación rápida no parpadea.
const SHOW_AFTER_MS = 250;
// Por si la navegación no termina nunca (fallo de red): no dejar la barra fija.
const GIVE_UP_MS = 20000;

// Entre que se toca un enlace y llega la página siguiente (con poca cobertura
// puede tardar segundos) no hay nada en pantalla que lo diga. Esta barra fina
// y, si se alarga, un mensaje, avisan de que el toque se ha recibido.
export function NavigationProgress() {
  const pathname = usePathname();
  // La ruta de la que se sale: mientras siga siendo la actual, se está navegando.
  const [from, setFrom] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // El <Link> de Next ya ha tomado el clic (preventDefault) cuando
      // llega aquí; así solo se cuentan las navegaciones internas reales.
      if (!e.defaultPrevented || e.button !== 0) return;
      const link = (e.target as Element | null)?.closest('a[href]');
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.target && link.target !== '_self') return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname) return;
      setFrom(location.pathname);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  // La navegación termina cuando cambia la ruta (también con «atrás»).
  const [seen, setSeen] = useState(pathname);
  if (seen !== pathname) {
    setSeen(pathname);
    setFrom(null);
  }
  const navigating = from !== null && from === pathname;

  useEffect(() => {
    if (!navigating) return;
    const show = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    const giveUp = setTimeout(() => setFrom(null), GIVE_UP_MS);
    return () => {
      clearTimeout(show);
      clearTimeout(giveUp);
      setVisible(false);
    };
  }, [navigating]);

  return (
    <>
      {navigating && visible && (
        <div className={styles.bar} aria-hidden="true" />
      )}
      <SlowNotice active={navigating} className={styles.slow} />
    </>
  );
}
