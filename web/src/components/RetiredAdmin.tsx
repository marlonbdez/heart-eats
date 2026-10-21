'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { ApiRequestError } from '@/lib/api';
import { getRetired, restoreListing } from '@/lib/data';
import type { Retired, RetiredListing } from '@/lib/types';
import { useLoad } from '@/lib/use-load';
import { Remote } from './Remote';
import form from './Form.module.css';
import styles from './Moderation.module.css';

const DAY = 24 * 60 * 60_000;

// Lo retirado que espera su borrado definitivo y cuándo llega: fichas (que se
// pueden devolver mientras sigan ahí) e historias (que no, porque retirarlas es
// retirar el consentimiento). Solo lo ve un administrador (ADR 0008).
export function RetiredAdmin() {
  const retired = useLoad(getRetired);
  return (
    <Remote state={retired}>
      {(loaded) => <RetiredView initial={loaded} />}
    </Remote>
  );
}

type Notice = { kind: 'restored' | 'gone'; name: string };

function RetiredView({ initial }: { initial: Retired }) {
  const t = useTranslations('moderation.retired');
  const [listings, setListings] = useState(initial.listings);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [now] = useState(() => Date.now());
  const noticeRef = useRef<HTMLParagraphElement>(null);

  // La fila desaparece al restaurar: el foco pasa al aviso.
  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);

  return (
    <div className={styles.admin}>
      <h2>{t('title')}</h2>
      <p className={styles.meta}>{t('intro')}</p>
      {notice && (
        <p
          ref={noticeRef}
          tabIndex={-1}
          role={notice.kind === 'gone' ? 'alert' : 'status'}
          className={styles.result}
        >
          {t(`notice.${notice.kind}`, { name: notice.name })}
        </p>
      )}

      <h3>{t('listingsTitle')}</h3>
      {listings.length === 0 ? (
        <p className={styles.empty}>{t('noListings')}</p>
      ) : (
        <ul className={styles.items}>
          {listings.map((listing) => (
            <ListingRow
              key={listing.id}
              now={now}
              listing={listing}
              onDone={(kind) => {
                setListings((all) => all.filter((l) => l.id !== listing.id));
                setNotice({ kind, name: listing.name });
              }}
            />
          ))}
        </ul>
      )}

      <h3>{t('storiesTitle')}</h3>
      <p className={styles.meta}>{t('storiesHelp')}</p>
      {initial.stories.length === 0 ? (
        <p className={styles.empty}>{t('noStories')}</p>
      ) : (
        <ul className={styles.items}>
          {initial.stories.map((story) => (
            <li
              key={`${story.restaurantSlug}-${story.index}`}
              className={styles.person}
            >
              <span className={styles.itemName}>
                {t('story', {
                  name: story.restaurantName,
                  n: story.index + 1,
                })}
              </span>
              <Dates
                now={now}
                retiredAt={story.revokedAt}
                deleteAt={story.deleteAt}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Dates({
  now,
  retiredAt,
  deleteAt,
}: {
  now: number;
  retiredAt: string;
  deleteAt: string;
}) {
  const t = useTranslations('moderation.retired');
  const format = useFormatter();
  const date = (iso: string) =>
    format.dateTime(new Date(iso), { dateStyle: 'medium' });
  const days = Math.max(
    0,
    Math.ceil((new Date(deleteAt).getTime() - now) / DAY),
  );
  return (
    <>
      <span className={styles.itemMeta}>
        {t('retiredOn', { date: date(retiredAt) })}
      </span>
      <span className={styles.itemMeta}>
        {t('deleteOn', { date: date(deleteAt), days })}
      </span>
    </>
  );
}

function ListingRow({
  now,
  listing,
  onDone,
}: {
  now: number;
  listing: RetiredListing;
  onDone: (kind: 'restored' | 'gone') => void;
}) {
  const t = useTranslations('moderation.retired');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  async function restore() {
    setSaving(true);
    setFailed(false);
    try {
      await restoreListing(listing.id);
      onDone('restored');
    } catch (err) {
      // Ya no estaba pendiente: la borró el trabajo horario o la devolvió otra
      // persona. Se quita de la lista y se avisa.
      if (err instanceof ApiRequestError && err.status === 404) {
        return onDone('gone');
      }
      setFailed(true);
      setSaving(false);
    }
  }

  return (
    <li className={styles.person}>
      <span className={styles.itemName}>{listing.name}</span>
      <span className={styles.itemMeta}>{listing.city}</span>
      <Dates
        now={now}
        retiredAt={listing.retiredAt}
        deleteAt={listing.deleteAt}
      />
      {!confirming && (
        <button
          type="button"
          className={`${form.btn} ${form.secondary}`}
          aria-label={t('restoreLabel', { name: listing.name })}
          onClick={() => setConfirming(true)}
        >
          {t('restore')}
        </button>
      )}
      {confirming && (
        <div className={styles.confirmRow}>
          <p className={styles.meta}>
            {t('confirmAsk', { name: listing.name })}
          </p>
          {failed && (
            <p role="alert" className={form.error}>
              {t('errors.restore')}
            </p>
          )}
          <button
            type="button"
            className={`${form.btn} ${form.primary}`}
            disabled={saving}
            onClick={restore}
          >
            {saving ? t('saving') : t('confirm')}
          </button>
          <button
            type="button"
            className={`${form.btn} ${form.secondary}`}
            disabled={saving}
            onClick={() => {
              setConfirming(false);
              setFailed(false);
            }}
          >
            {t('cancel')}
          </button>
        </div>
      )}
    </li>
  );
}
