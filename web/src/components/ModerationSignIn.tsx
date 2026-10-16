'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { startSession } from '@/lib/data';
import { ModerationLogin } from './ModerationLogin';
import styles from './Moderation.module.css';

// Destino del enlace del correo (/moderation/login#token=…). El token viaja en
// el fragmento, que el navegador no envía a ningún servidor; se quita de la
// dirección antes de usarlo y solo vale una vez.
export function ModerationSignIn() {
  const t = useTranslations('moderation');
  const router = useRouter();
  const started = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = new URLSearchParams(window.location.hash.slice(1)).get(
      'token',
    );
    window.history.replaceState(null, '', window.location.pathname);
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFailed(true);
      return;
    }
    startSession(token).then(
      () => router.replace('/moderation'),
      () => setFailed(true),
    );
  }, [router]);

  return (
    <main id="contenido" tabIndex={-1} className={styles.main}>
      <h1>{t('title')}</h1>
      {failed ? (
        <ModerationLogin notice={t('login.invalidLink')} />
      ) : (
        <p role="status">{t('login.entering')}</p>
      )}
    </main>
  );
}
