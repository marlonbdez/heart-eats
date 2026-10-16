'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { ApiRequestError } from '@/lib/api';
import { disableStaff, getStaff, inviteStaff } from '@/lib/data';
import type { StaffMember } from '@/lib/types';
import { useLoad } from '@/lib/use-load';
import { isEmail } from '@/lib/validation';
import { Remote } from './Remote';
import form from './Form.module.css';
import styles from './Moderation.module.css';

// Quién modera: invitar a una persona y dar de baja a un moderador. Solo lo
// ve un administrador (ADR 0008).
export function StaffAdmin() {
  const members = useLoad(getStaff);
  return (
    <Remote state={members}>
      {(loaded) => <StaffView initial={loaded} />}
    </Remote>
  );
}

const scopeText = (scope: StaffMember['moderationScope']) =>
  scope
    .map((s) => (s.city ? `${s.country} · ${s.city}` : s.country))
    .join(', ');

function StaffView({ initial }: { initial: StaffMember[] }) {
  const t = useTranslations('moderation.staff');
  const [members, setMembers] = useState(initial);
  const [invited, setInvited] = useState<string | null>(null);

  function upsert(member: StaffMember) {
    setMembers((all) =>
      all.some((m) => m.id === member.id)
        ? all.map((m) => (m.id === member.id ? member : m))
        : [...all, member],
    );
  }

  return (
    <div className={styles.admin}>
      <h2>{t('title')}</h2>
      <p className={styles.meta}>{t('intro')}</p>
      <InviteForm
        onInvited={(member) => {
          upsert(member);
          setInvited(member.email);
        }}
        onEdit={() => setInvited(null)}
      />
      {invited && (
        <p role="status" className={styles.result}>
          {t('invited', { email: invited })}
        </p>
      )}
      <h3>{t('listTitle')}</h3>
      <ul className={styles.items}>
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            onDisabled={() =>
              upsert({ ...member, disabledAt: new Date().toISOString() })
            }
          />
        ))}
      </ul>
    </div>
  );
}

function InviteForm({
  onInvited,
  onEdit,
}: {
  onInvited: (member: StaffMember) => void;
  onEdit: () => void;
}) {
  const t = useTranslations('moderation.staff');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('ES');
  const [city, setCity] = useState('Madrid');
  const [error, setError] = useState<
    'invalidEmail' | 'invalidCountry' | 'exists' | 'forbidden' | 'save' | null
  >(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isEmail(email.trim())) return setError('invalidEmail');
    if (!/^[A-Za-z]{2}$/.test(country.trim()))
      return setError('invalidCountry');
    setError(null);
    setSaving(true);
    try {
      const member = await inviteStaff({
        email: email.trim(),
        country: country.trim(),
        city: city.trim() || undefined,
      });
      onInvited(member);
      setEmail('');
    } catch (err) {
      const status = err instanceof ApiRequestError ? err.status : undefined;
      setError(
        status === 409 ? 'exists' : status === 403 ? 'forbidden' : 'save',
      );
    } finally {
      setSaving(false);
    }
  }

  const edit =
    (set: (value: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      set(e.target.value);
      onEdit();
    };

  return (
    <form onSubmit={submit} noValidate className={styles.invite}>
      <h3>{t('inviteTitle')}</h3>
      <div className={form.field}>
        <label className={form.label} htmlFor="staff-email">
          {t('email')}
        </label>
        <input
          id="staff-email"
          type="email"
          autoComplete="off"
          className={form.input}
          value={email}
          onChange={edit(setEmail)}
          aria-invalid={error === 'invalidEmail' || undefined}
        />
      </div>
      <div className={form.grid}>
        <div className={form.field}>
          <label className={form.label} htmlFor="staff-country">
            {t('country')}
          </label>
          <input
            id="staff-country"
            maxLength={2}
            autoComplete="off"
            className={form.input}
            value={country}
            onChange={edit(setCountry)}
            aria-invalid={error === 'invalidCountry' || undefined}
          />
        </div>
        <div className={form.field}>
          <label className={form.label} htmlFor="staff-city">
            {t('city')} <span className={form.optional}>{t('optional')}</span>
          </label>
          <input
            id="staff-city"
            maxLength={100}
            autoComplete="off"
            className={form.input}
            value={city}
            onChange={edit(setCity)}
          />
        </div>
      </div>
      {error && (
        <p role="alert" className={form.error}>
          {t(`errors.${error}`)}
        </p>
      )}
      <button
        type="submit"
        className={`${form.btn} ${form.primary}`}
        disabled={saving}
      >
        {saving ? t('saving') : t('submit')}
      </button>
    </form>
  );
}

function MemberRow({
  member,
  onDisabled,
}: {
  member: StaffMember;
  onDisabled: () => void;
}) {
  const t = useTranslations('moderation.staff');
  const format = useFormatter();
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const row = useRef<HTMLLIElement>(null);
  const justDisabled = useRef(false);

  // Al darse de baja, el botón desaparece: el foco pasa a la propia fila.
  useEffect(() => {
    if (member.disabledAt && justDisabled.current) {
      row.current?.focus();
      justDisabled.current = false;
    }
  }, [member.disabledAt]);

  async function disable() {
    setSaving(true);
    setFailed(false);
    try {
      await disableStaff(member.id);
      justDisabled.current = true;
      onDisabled();
    } catch {
      setFailed(true);
      setSaving(false);
    }
  }

  const date = (iso: string) =>
    format.dateTime(new Date(iso), { dateStyle: 'medium' });

  return (
    <li ref={row} tabIndex={-1} className={styles.person}>
      <span className={styles.itemName}>{member.email}</span>
      <span className={styles.itemMeta}>
        {t(`roles.${member.role}`)} ·{' '}
        {member.moderationScope.length > 0
          ? t('scope', { scope: scopeText(member.moderationScope) })
          : t('scopeNone')}
      </span>
      <span className={styles.itemMeta}>
        {member.disabledAt
          ? t('disabledOn', { date: date(member.disabledAt) })
          : t('since', { date: date(member.createdAt) })}
      </span>
      {!member.disabledAt && member.role === 'moderator' && !confirming && (
        <button
          type="button"
          className={`${form.btn} ${form.secondary}`}
          aria-label={t('disableLabel', { email: member.email })}
          onClick={() => setConfirming(true)}
        >
          {t('disable')}
        </button>
      )}
      {confirming && !member.disabledAt && (
        <div className={styles.confirmRow}>
          <p className={styles.meta}>
            {t('confirmAsk', { email: member.email })}
          </p>
          {failed && (
            <p role="alert" className={form.error}>
              {t('errors.disable')}
            </p>
          )}
          <button
            type="button"
            className={`${form.btn} ${form.primary}`}
            disabled={saving}
            onClick={disable}
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
