'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type {
  ModerationDecision,
  ModerationItem,
  RejectReason,
  VerificationLevel,
  VerificationMethod,
} from '@/lib/types';
import form from './Form.module.css';
import styles from './Moderation.module.css';

const CHECKS_NEW = ['exists', 'independent', 'inclusive', 'owner'] as const;
const CHECKS_EDIT = ['correct'] as const;
const LEVELS: VerificationLevel[] = ['admin', 'community'];
const METHODS: VerificationMethod[] = [
  'visit',
  'call',
  'documentation',
  'owner_confirmed',
];
const REASONS: RejectReason[] = [
  'not_independent',
  'no_evidence',
  'duplicate',
  'out_of_zone',
  'other',
];

interface Props {
  item: ModerationItem;
  decision?: ModerationDecision; // si ya está resuelta
  onBack: () => void;
  onDecide: (decision: ModerationDecision) => Promise<void>;
}

export function ModerationDetail({ item, decision, onBack, onDecide }: Props) {
  const t = useTranslations('moderation');
  const tCard = useTranslations('card');
  const tFood = useTranslations('foodTags');
  const tKinds = useTranslations('correct.kinds');
  const isNew = item.kind === 'new';
  const checkKeys = isNew ? CHECKS_NEW : CHECKS_EDIT;

  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [level, setLevel] = useState<VerificationLevel | null>(null);
  const [method, setMethod] = useState<VerificationMethod | null>(null);
  const [mode, setMode] = useState<'reject' | 'info' | null>(null);
  const [reason, setReason] = useState<RejectReason | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const resultRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const allChecked = checkKeys.every((k) => checks[k]);
  const ready = allChecked && (!isNew || (level !== null && method !== null));

  async function submit(d: ModerationDecision) {
    setSaving(true);
    setError('');
    try {
      await onDecide(d);
      setMode(null);
      // Tras guardar, el foco va al resultado para que se anuncie.
      setTimeout(() => resultRef.current?.focus(), 0);
    } catch {
      setError(t('errors.save'));
    } finally {
      setSaving(false);
    }
  }

  function approve() {
    if (!allChecked) {
      setError(t(isNew ? 'errors.notReadyNew' : 'errors.notReadyEdit'));
    } else if (isNew && (!level || !method)) {
      setError(t('errors.needLevelMethod'));
    } else {
      void submit({
        action: 'approve',
        ...(isNew && level && method ? { level, method } : {}),
      });
    }
  }

  function confirmMode() {
    if (mode === 'reject') {
      if (!reason) return setError(t('errors.needReason'));
      void submit({
        action: 'reject',
        reason,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
    } else {
      if (!note.trim()) return setError(t('errors.needNote'));
      void submit({ action: 'ask_info', note: note.trim() });
    }
  }

  function chooseMode(next: 'reject' | 'info') {
    setMode(next);
    setError('');
  }

  function logLine(d: ModerationDecision): string {
    const name = item.name;
    if (d.action === 'reject') {
      return t('log.rejected', { name, reason: t(`reasons.${d.reason}`) });
    }
    if (d.action === 'ask_info') return t('log.info', { name });
    if (!isNew || !d.level || !d.method) return t('log.approvedEdit', { name });
    return t('log.approvedNew', {
      name,
      level: tCard(d.level === 'admin' ? 'verifiedAdmin' : 'verifiedCommunity'),
      method: tCard(`methods.${d.method}`),
    });
  }

  function resultText(d: ModerationDecision): string {
    if (d.action === 'reject') return t('result.rejected');
    if (d.action === 'ask_info') return t('result.info');
    return t(isNew ? 'result.approvedNew' : 'result.approvedEdit');
  }

  return (
    <>
      <button type="button" className={styles.back} onClick={onBack}>
        <span aria-hidden="true">← </span>
        {t('back')}
      </button>

      <div>
        <span className={styles.tag}>{t(`kinds.${item.kind}`)}</span>
        <h2 ref={headingRef} tabIndex={-1}>
          {item.name}
        </h2>
        <p className={styles.meta}>{item.address}</p>
        <p className={styles.meta}>
          {t('received', { age: t('age', { days: item.daysAgo }) })} ·{' '}
          {t('contact', { contact: item.contactMasked ?? t('noContact') })}
        </p>
      </div>

      {item.warnings.length > 0 && (
        <div className={styles.warn} role="note">
          <p>
            <strong>
              <span aria-hidden="true">⚠ </span>
              {t('warningsTitle')}
            </strong>
          </p>
          <ul>
            {item.warnings.map((w) => (
              <li key={w.kind}>
                {w.kind === 'duplicate'
                  ? t('warnings.duplicate', {
                      other: w.other,
                      meters: w.meters,
                    })
                  : t(`warnings.${w.kind}`)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {item.correction ? (
        <section aria-labelledby="mod-change" className={form.step}>
          <h3 id="mod-change">{t('change')}</h3>
          <p className={form.summary}>
            <strong>{tKinds(item.correction.kind)}</strong>
          </p>
          <dl className={styles.diff}>
            <div className={styles.diffBox}>
              <dt className={styles.tag}>{t('before')}</dt>
              <dd style={{ margin: 0 }}>
                <strong>{item.correction.before}</strong>
              </dd>
            </div>
            <div className={styles.diffBox}>
              <dt className={styles.tag}>{t('after')}</dt>
              <dd style={{ margin: 0 }}>
                <strong>{item.correction.after}</strong>
              </dd>
            </div>
          </dl>
          {item.restaurantSlug && (
            <Link
              href={`/place/${item.restaurantSlug}`}
              className={form.linkButton}
            >
              {t('seePlace')}
            </Link>
          )}
        </section>
      ) : (
        <section aria-labelledby="mod-proposed" className={form.step}>
          <h3 id="mod-proposed">{t('proposed')}</h3>
          <dl className={styles.facts}>
            <div>
              <dt>{t('food')}</dt>
              <dd>
                {item.foodTags?.map((k) => tFood(k)).join(' · ') || t('none')}
              </dd>
            </div>
            <div>
              <dt>{t('dishes')}</dt>
              <dd>{item.dishes?.join(' · ') || t('none')}</dd>
            </div>
            <div>
              <dt>{t('howKnown')}</dt>
              <dd>{item.howKnown || t('none')}</dd>
            </div>
            <div>
              <dt>{t('evidence')}</dt>
              <dd>
                {item.evidenceUrl ? (
                  <a
                    href={item.evidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.evidenceUrl.replace(/^https?:\/\//, '')}
                  </a>
                ) : (
                  t('noLink')
                )}
              </dd>
            </div>
          </dl>
        </section>
      )}

      {decision ? (
        <p
          ref={resultRef}
          tabIndex={-1}
          role="status"
          className={styles.result}
        >
          {resultText(decision)}
        </p>
      ) : (
        <>
          <fieldset className={form.options}>
            <legend>
              <h3>{t('checksTitle')}</h3>
            </legend>
            <div className={styles.checks}>
              {checkKeys.map((k) => (
                <label key={k} className={form.check}>
                  <input
                    type="checkbox"
                    checked={!!checks[k]}
                    onChange={(e) => {
                      setChecks({ ...checks, [k]: e.target.checked });
                      setError('');
                    }}
                  />
                  <span>{t(`checks.${k}`)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {mode === null && isNew && (
            <>
              <fieldset className={form.options}>
                <legend>{t('levelLegend')}</legend>
                {LEVELS.map((l) => (
                  <label key={l} className={form.check}>
                    <input
                      type="radio"
                      name="level"
                      checked={level === l}
                      onChange={() => {
                        setLevel(l);
                        setError('');
                      }}
                    />
                    <span>{t(`levels.${l}`)}</span>
                  </label>
                ))}
              </fieldset>
              <fieldset className={form.options}>
                <legend>{t('methodLegend')}</legend>
                {METHODS.map((m) => (
                  <label key={m} className={form.check}>
                    <input
                      type="radio"
                      name="method"
                      checked={method === m}
                      onChange={() => {
                        setMethod(m);
                        setError('');
                      }}
                    />
                    <span>{t(`methods.${m}`)}</span>
                  </label>
                ))}
              </fieldset>
            </>
          )}

          {mode === 'reject' && (
            <fieldset className={form.options}>
              <legend>{t('reasonLegend')}</legend>
              {REASONS.map((r) => (
                <label key={r} className={form.check}>
                  <input
                    type="radio"
                    name="reason"
                    checked={reason === r}
                    onChange={() => {
                      setReason(r);
                      setError('');
                    }}
                  />
                  <span>{t(`reasons.${r}`)}</span>
                </label>
              ))}
            </fieldset>
          )}

          {mode !== null && (
            <div className={form.field}>
              <label className={form.label} htmlFor="mod-note">
                {t(mode === 'reject' ? 'rejectNote' : 'infoNote')}
              </label>
              <textarea
                id="mod-note"
                className={form.textarea}
                rows={3}
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  setError('');
                }}
              />
            </div>
          )}

          {error && (
            <p role="alert" className={form.error}>
              {error}
            </p>
          )}

          {mode === null ? (
            <div className={styles.actions}>
              <button
                type="button"
                className={`${form.btn} ${form.primary} ${styles.full} ${
                  ready ? '' : styles.notReady
                }`}
                disabled={saving}
                onClick={approve}
              >
                {saving ? t('saving') : t(isNew ? 'approveNew' : 'approveEdit')}
              </button>
              <button
                type="button"
                className={`${form.btn} ${form.secondary}`}
                onClick={() => chooseMode('info')}
              >
                {t('askInfo')}
              </button>
              <button
                type="button"
                className={`${form.btn} ${form.secondary}`}
                onClick={() => chooseMode('reject')}
              >
                {t('reject')}
              </button>
            </div>
          ) : (
            <div className={styles.confirmRow}>
              <button
                type="button"
                className={`${form.btn} ${form.primary}`}
                disabled={saving}
                onClick={confirmMode}
              >
                {saving
                  ? t('saving')
                  : t(mode === 'reject' ? 'confirmReject' : 'confirmInfo')}
              </button>
              <button
                type="button"
                className={`${form.btn} ${form.secondary}`}
                disabled={saving}
                onClick={() => {
                  setMode(null);
                  setError('');
                }}
              >
                {t('cancel')}
              </button>
            </div>
          )}
        </>
      )}

      <section aria-labelledby="mod-audit" className={form.step}>
        <h3 id="mod-audit">{t('auditTitle')}</h3>
        <ul className={styles.log}>
          {decision && <li>{logLine(decision)}</li>}
          <li>{t('log.received')}</li>
        </ul>
      </section>
    </>
  );
}
