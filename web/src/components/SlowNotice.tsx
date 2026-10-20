'use client';

import { useTranslations } from 'next-intl';
import { useSlow } from '@/lib/use-slow';
import styles from './SlowNotice.module.css';

// Un mensaje amable cuando la espera se alarga (poca cobertura): que se note
// que la web sigue trabajando y no se ha quedado parada.
export function SlowNotice({
  active,
  kind = 'load',
  className,
}: {
  active: boolean;
  kind?: 'load' | 'send';
  className?: string;
}) {
  const t = useTranslations('load');
  const slow = useSlow(active);
  if (!slow) return null;
  return (
    <p role="status" className={className ?? styles.notice}>
      {t(kind === 'send' ? 'slowSending' : 'slow')}
    </p>
  );
}
