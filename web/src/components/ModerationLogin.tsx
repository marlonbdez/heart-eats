'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { isRateLimited } from '@/lib/api';
import { requestLoginLink } from '@/lib/data';
import { isEmail } from '@/lib/validation';
import form from './Form.module.css';
import styles from './Moderation.module.css';

// Pide el enlace de entrada. La respuesta es siempre la misma, sea o no del
// equipo de moderación quien lo pide (ADR 0007).
export function ModerationLogin({ notice }: { notice?: string }) {
  const t = useTranslations('moderation.login');
  const locale = useLocale() === 'en' ? 'en' : 'es';
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'sending' | 'sent' | 'invalid' | 'limited' | 'error'
  >('idle');

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!isEmail(email.trim())) return setStatus('invalid');
    setStatus('sending');
    try {
      await requestLoginLink(email.trim(), locale);
      setStatus('sent');
    } catch (err) {
      setStatus(isRateLimited(err) ? 'limited' : 'error');
    }
  }

  if (status === 'sent') {
    return (
      <p role="status" className={styles.demo}>
        {t('sent')}
      </p>
    );
  }

  return (
    <form onSubmit={send} noValidate className={styles.login}>
      {notice && (
        <p role="alert" className={form.error}>
          {notice}
        </p>
      )}
      <p>{t('intro')}</p>
      <div className={form.field}>
        <label className={form.label} htmlFor="mod-email">
          {t('email')}
        </label>
        <input
          id="mod-email"
          type="email"
          autoComplete="email"
          className={form.input}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status !== 'sending') setStatus('idle');
          }}
          aria-invalid={status === 'invalid' || undefined}
        />
      </div>
      {status !== 'idle' && status !== 'sending' && (
        <p role="alert" className={form.error}>
          {t(status)}
        </p>
      )}
      <button
        type="submit"
        className={`${form.btn} ${form.primary}`}
        disabled={status === 'sending'}
      >
        {status === 'sending' ? t('sending') : t('submit')}
      </button>
    </form>
  );
}
