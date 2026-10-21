'use client';

import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { getAudit } from '@/lib/data';
import type { AuditEntity, AuditLine, AuditPage } from '@/lib/types';
import { useLoad } from '@/lib/use-load';
import { Remote } from './Remote';
import form from './Form.module.css';
import styles from './Moderation.module.css';

type Filter = AuditEntity | 'all';

const filters: Filter[] = ['all', 'restaurant', 'team', 'suggestion', 'user'];

// Acciones con texto propio; las demás se muestran tal cual.
const knownActions = new Set([
  'approve',
  'reject',
  'ask_info',
  'login',
  'invite',
  'reinstate',
  'disable',
  'archive',
  'auto_close',
  'create',
  'update',
  'purge_email',
  'purge_listing',
  'purge_stories',
  'revoke_story',
]);

const loadFirst = (filter: Filter) =>
  getAudit(filter === 'all' ? undefined : filter);

// El registro de lo que se ha hecho, de lo más reciente a lo más antiguo. Solo
// lo ve un administrador (ADR 0008).
export function AuditAdmin() {
  const t = useTranslations('moderation.audit');
  const [filter, setFilter] = useState<Filter>('all');
  const first = useLoad(loadFirst, filter);

  return (
    <div className={styles.admin}>
      <h2>{t('title')}</h2>
      <p className={styles.meta}>{t('intro')}</p>
      <div className={form.field}>
        <label className={form.label} htmlFor="audit-filter">
          {t('filterLabel')}
        </label>
        <select
          id="audit-filter"
          className={form.input}
          value={filter}
          onChange={(e) => setFilter(e.target.value as Filter)}
        >
          {filters.map((f) => (
            <option key={f} value={f}>
              {f === 'all' ? t('all') : t(`entities.${f}`)}
            </option>
          ))}
        </select>
      </div>
      <Remote state={first}>
        {(page) => <AuditList key={filter} filter={filter} first={page} />}
      </Remote>
    </div>
  );
}

function AuditList({ filter, first }: { filter: Filter; first: AuditPage }) {
  const t = useTranslations('moderation.audit');
  const [lines, setLines] = useState<AuditLine[]>(first.items);
  const [cursor, setCursor] = useState(first.nextCursor);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function more() {
    setLoading(true);
    setFailed(false);
    try {
      const page = await getAudit(
        filter === 'all' ? undefined : filter,
        cursor,
      );
      setLines((all) => [...all, ...page.items]);
      setCursor(page.nextCursor);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  if (lines.length === 0) return <p className={styles.empty}>{t('empty')}</p>;
  return (
    <>
      <ul className={styles.items}>
        {lines.map((line) => (
          <AuditRow key={line.id} line={line} />
        ))}
      </ul>
      {failed && (
        <p role="alert" className={form.error}>
          {t('moreError')}
        </p>
      )}
      {cursor && (
        <button
          type="button"
          className={`${form.btn} ${form.secondary}`}
          disabled={loading}
          onClick={more}
        >
          {loading ? t('loadingMore') : t('more')}
        </button>
      )}
    </>
  );
}

const diffText = (diff: Record<string, unknown>) =>
  Object.entries(diff)
    .map(
      ([key, value]) =>
        `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`,
    )
    .join(' · ');

function AuditRow({ line }: { line: AuditLine }) {
  const t = useTranslations('moderation.audit');
  const format = useFormatter();
  return (
    <li className={styles.person}>
      <span className={styles.itemHead}>
        <span className={styles.tag}>{t(`entities.${line.entity}`)}</span>
        <span className={styles.status}>
          {knownActions.has(line.action)
            ? t(`actions.${line.action}`)
            : line.action}
        </span>
      </span>
      <span className={styles.itemMeta}>
        {format.dateTime(new Date(line.at), {
          dateStyle: 'medium',
          timeStyle: 'short',
        })}{' '}
        · {line.actor ? t('by', { email: line.actor }) : t('system')}
      </span>
      {line.diff && Object.keys(line.diff).length > 0 && (
        <span className={styles.diffText}>{diffText(line.diff)}</span>
      )}
    </li>
  );
}
