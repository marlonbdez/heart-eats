'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { getSession } from '@/lib/data';
import { useLoad } from '@/lib/use-load';
import { ModerationLogin } from './ModerationLogin';
import { ModerationPanel } from './ModerationPanel';
import { Remote } from './Remote';
import styles from './Moderation.module.css';

// Moderación: sin sesión, la entrada con enlace por correo; con ella, la cola.
// No está en el menú público.
export function ModerationApp() {
  const t = useTranslations('moderation');
  const session = useLoad(getSession);
  const [signedOut, setSignedOut] = useState(false);

  return (
    <main id="contenido" tabIndex={-1} className={styles.main}>
      <h1>{t('title')}</h1>
      <Remote state={session}>
        {(current) =>
          current && !signedOut ? (
            <ModerationPanel
              session={current}
              onSignOut={() => setSignedOut(true)}
            />
          ) : (
            <ModerationLogin />
          )
        }
      </Remote>
    </main>
  );
}
