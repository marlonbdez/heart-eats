'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  clearDemoSubmissions,
  decideModeration,
  getDemoSubmissions,
} from '@/lib/data';
import type { ModerationDecision, ModerationItem } from '@/lib/types';
import { ModerationDetail } from './ModerationDetail';
import form from './Form.module.css';
import styles from './Moderation.module.css';

type Tab = 'pending' | 'resolved';

const STATUS = { approve: 'approved', reject: 'rejected', ask_info: 'info' };

// Pantalla de moderación (F5). En el móvil la lista y el detalle son dos
// vistas, una a la vez; en pantallas anchas se ven juntas.
export function ModerationPanel({
  items: examples,
}: {
  items: ModerationItem[];
}) {
  const t = useTranslations('moderation');
  // Envíos hechos desde este navegador (solo se leen en el cliente).
  const [mine, setMine] = useState<ModerationItem[]>([]);
  const items = [...mine, ...examples];
  const [tab, setTab] = useState<Tab>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<
    Record<string, ModerationDecision>
  >({});
  useEffect(() => {
    void getDemoSubmissions().then(setMine);
  }, []);

  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const tabRef = useRef<HTMLButtonElement>(null);
  const lastId = useRef<string | null>(null);

  const pending = items.filter((i) => !decisions[i.id]);
  const resolved = items.filter((i) => decisions[i.id]);
  const shown = tab === 'pending' ? pending : resolved;
  const selected = items.find((i) => i.id === selectedId) ?? null;

  // Al volver a la lista, el foco vuelve a la solicitud que se estaba
  // viendo (o a las pestañas si ya no está en esta lista).
  useEffect(() => {
    if (selectedId !== null || lastId.current === null) return;
    (itemRefs.current[lastId.current] ?? tabRef.current)?.focus();
    lastId.current = null;
  }, [selectedId]);

  function open(id: string) {
    lastId.current = id;
    setSelectedId(id);
  }

  async function clearMine() {
    await clearDemoSubmissions();
    if (selected && mine.some((m) => m.id === selected.id)) setSelectedId(null);
    setMine([]);
  }

  async function decide(item: ModerationItem, decision: ModerationDecision) {
    await decideModeration(item.id, decision);
    setDecisions((d) => ({ ...d, [item.id]: decision }));
  }

  return (
    <main id="contenido" tabIndex={-1} className={styles.main}>
      <h1>{t('title')}</h1>
      <p className={styles.demo}>{t('demo')}</p>
      {mine.length > 0 && (
        <p className={styles.demo}>
          {t('mine', { n: mine.length })}{' '}
          <button type="button" className={form.linkButton} onClick={clearMine}>
            {t('clearMine')}
          </button>
        </p>
      )}
      <div className={styles.layout} data-detail={selected ? 'true' : 'false'}>
        <section className={styles.queue} aria-label={t('queueLabel')}>
          <div
            className={styles.tabs}
            role="group"
            aria-label={t('queueLabel')}
          >
            <button
              type="button"
              ref={tabRef}
              className={styles.tab}
              aria-pressed={tab === 'pending'}
              onClick={() => setTab('pending')}
            >
              {t('tabs.pending', { n: pending.length })}
            </button>
            <button
              type="button"
              className={styles.tab}
              aria-pressed={tab === 'resolved'}
              onClick={() => setTab('resolved')}
            >
              {t('tabs.resolved', { n: resolved.length })}
            </button>
          </div>
          {shown.length === 0 ? (
            <p className={styles.empty}>
              {t(tab === 'pending' ? 'emptyPending' : 'emptyResolved')}
            </p>
          ) : (
            <ul className={styles.items}>
              {shown.map((item) => {
                const decision = decisions[item.id];
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      ref={(el) => {
                        itemRefs.current[item.id] = el;
                      }}
                      className={styles.item}
                      aria-current={item.id === selectedId ? 'true' : undefined}
                      onClick={() => open(item.id)}
                    >
                      <span className={styles.itemHead}>
                        <span className={styles.tag}>
                          {t(`kinds.${item.kind}`)}
                        </span>
                        {!decision && item.warnings.length > 0 && (
                          <span className={styles.flag}>
                            <span aria-hidden="true">⚠ </span>
                            {t('review')}
                          </span>
                        )}
                        {decision && (
                          <span className={styles.status}>
                            {t(`status.${STATUS[decision.action]}`)}
                          </span>
                        )}
                      </span>
                      <span className={styles.itemName}>{item.name}</span>
                      <span className={styles.itemMeta}>
                        {item.neighborhood} · {t('age', { days: item.daysAgo })}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={styles.detail}>
          {selected ? (
            <ModerationDetail
              key={selected.id}
              item={selected}
              decision={decisions[selected.id]}
              onBack={() => setSelectedId(null)}
              onDecide={(d) => decide(selected, d)}
            />
          ) : (
            <p className={styles.choose}>{t('choose')}</p>
          )}
        </section>
      </div>
    </main>
  );
}
