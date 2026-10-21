'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  decideModeration,
  endSession,
  getModerationItem,
  getModerationQueue,
} from '@/lib/data';
import { useLoad } from '@/lib/use-load';
import type {
  ModerationDecision,
  ModerationItem,
  ModerationSession,
} from '@/lib/types';
import { AuditAdmin } from './AuditAdmin';
import { ModerationDetail } from './ModerationDetail';
import { PlacePhotosAdmin } from './PlacePhotosAdmin';
import { Remote } from './Remote';
import { RetiredAdmin } from './RetiredAdmin';
import { StaffAdmin } from './StaffAdmin';
import form from './Form.module.css';
import styles from './Moderation.module.css';

type Tab = 'pending' | 'resolved';
type Section = 'queue' | 'photos' | 'retired' | 'staff' | 'audit';
// Lo retirado, los usuarios y el registro son solo de administración.
const sectionsFor = (isAdmin: boolean): Section[] =>
  isAdmin
    ? ['queue', 'photos', 'retired', 'staff', 'audit']
    : ['queue', 'photos'];

// Las tres listas de la cola: lo pendiente, lo que espera respuesta de quien
// propuso y lo ya resuelto.
const loadQueue = async () => {
  const [pending, waiting, resolved] = await Promise.all([
    getModerationQueue('pending'),
    getModerationQueue('info_requested'),
    getModerationQueue('resolved'),
  ]);
  return [...pending, ...waiting, ...resolved];
};

// Pantalla de moderación (F5). En el móvil la lista y el detalle son dos
// vistas, una a la vez; en pantallas anchas se ven juntas.
export function ModerationPanel({
  session,
  onSignOut,
}: {
  session: ModerationSession;
  onSignOut: () => void;
}) {
  const t = useTranslations('moderation');
  const [section, setSection] = useState<Section>('queue');
  // El local cuyas fotos se abren desde una solicitud de retirada de foto.
  const [photosSlug, setPhotosSlug] = useState<string>();
  const isAdmin = session.role === 'admin';
  return (
    <>
      <div className={styles.bar}>
        <p className={styles.who}>
          {t('signedInAs', { email: session.email })}
        </p>
        <button
          type="button"
          className={form.linkButton}
          onClick={async () => {
            await endSession().catch(() => undefined);
            onSignOut();
          }}
        >
          {t('signOut')}
        </button>
      </div>
      <div
        className={styles.sections}
        role="group"
        aria-label={t('sections.label')}
      >
        {sectionsFor(isAdmin).map((s) => (
          <button
            key={s}
            type="button"
            className={styles.tab}
            aria-pressed={section === s}
            onClick={() => {
              setSection(s);
              setPhotosSlug(undefined);
            }}
          >
            {t(`sections.${s}`)}
          </button>
        ))}
      </div>
      {section === 'queue' ? (
        <QueueSection
          role={session.role}
          onOpenPhotos={(slug) => {
            setPhotosSlug(slug);
            setSection('photos');
          }}
        />
      ) : section === 'photos' ? (
        <PlacePhotosAdmin
          key={photosSlug ?? ''}
          initialSlug={photosSlug}
          defaultCountry={
            session.moderationScope.find((s) => /^[A-Z]{2}$/.test(s.country))
              ?.country
          }
        />
      ) : !isAdmin ? null : section === 'retired' ? (
        <RetiredAdmin />
      ) : section === 'staff' ? (
        <StaffAdmin />
      ) : (
        <AuditAdmin />
      )}
    </>
  );
}

function QueueSection({
  role,
  onOpenPhotos,
}: {
  role: ModerationSession['role'];
  onOpenPhotos: (slug: string) => void;
}) {
  const queue = useLoad(loadQueue);
  return (
    <Remote state={queue}>
      {(items) => (
        <Queue items={items} role={role} onOpenPhotos={onOpenPhotos} />
      )}
    </Remote>
  );
}

function Queue({
  items,
  role,
  onOpenPhotos,
}: {
  items: ModerationItem[];
  role: ModerationSession['role'];
  onOpenPhotos: (slug: string) => void;
}) {
  const t = useTranslations('moderation');
  const [tab, setTab] = useState<Tab>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Lo decidido desde esta pantalla, que aún no está en las listas cargadas.
  const [decisions, setDecisions] = useState<
    Record<string, ModerationDecision>
  >({});

  // El detalle de lo abierto: el servidor geocodifica y avisa de duplicados al
  // abrir un local nuevo, y la cola no lo trae.
  const [details, setDetails] = useState<Record<string, ModerationItem>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const tabRef = useRef<HTMLButtonElement>(null);
  const lastId = useRef<string | null>(null);

  const isResolved = (i: ModerationItem) => {
    const d = decisions[i.id];
    if (d) return d.action !== 'ask_info';
    return i.status === 'approved' || i.status === 'rejected';
  };
  const pending = items.filter((i) => !isResolved(i));
  const resolved = items.filter(isResolved);
  const shown = tab === 'pending' ? pending : resolved;
  const selected =
    (selectedId && details[selectedId]) ||
    (items.find((i) => i.id === selectedId) ?? null);

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
    const item = items.find((i) => i.id === id);
    if (!item || details[id] || isResolved(item)) return;
    // Si falla, se queda lo que trae la cola: el pin se puede poner a mano.
    setLoadingId(id);
    getModerationItem(id)
      .then((detail) => setDetails((d) => ({ ...d, [id]: detail })))
      .catch(() => undefined)
      .finally(() =>
        setLoadingId((current) => (current === id ? null : current)),
      );
  }

  async function decide(item: ModerationItem, decision: ModerationDecision) {
    await decideModeration(item, decision);
    setDecisions((d) => ({ ...d, [item.id]: decision }));
  }

  return (
    <>
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
                const status = decision
                  ? {
                      approve: 'approved',
                      reject: 'rejected',
                      ask_info: 'info',
                    }[decision.action]
                  : {
                      pending: null,
                      info_requested: 'info',
                      approved: 'approved',
                      rejected: 'rejected',
                    }[item.status];
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
                        {!status && item.warnings.length > 0 && (
                          <span className={styles.flag}>
                            <span aria-hidden="true">⚠ </span>
                            {t('review')}
                          </span>
                        )}
                        {status && (
                          <span className={styles.status}>
                            {t(`status.${status}`)}
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
              role={role}
              decision={decisions[selected.id]}
              loading={loadingId === selected.id}
              onBack={() => setSelectedId(null)}
              onDecide={(d) => decide(selected, d)}
              onOpenPhotos={onOpenPhotos}
            />
          ) : (
            <p className={styles.choose}>{t('choose')}</p>
          )}
        </section>
      </div>
    </>
  );
}
