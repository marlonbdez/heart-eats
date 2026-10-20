'use client';

import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ApiRequestError, isRateLimited } from '@/lib/api';
import { getInfoRequest, sendReply, type InfoRequest } from '@/lib/data';
import { Link } from '@/i18n/navigation';
import { useLoad } from '@/lib/use-load';
import { Remote } from './Remote';
import { SlowNotice } from './SlowNotice';
import { Spinner } from './Spinner';
import s from './Form.module.css';

const MAX = 2000;
const noop = () => () => {};

// Destino del enlace del correo (/reply#token=…). El token viaja en el
// fragmento, que el navegador no envía a ningún servidor.
export function ReplyForm() {
  const t = useTranslations('reply');
  const hash = useSyncExternalStore(
    noop,
    () => window.location.hash,
    () => '',
  );
  const token = new URLSearchParams(hash.slice(1)).get('token');

  return (
    <main id="contenido" className={s.main}>
      <h1 style={{ fontSize: '1.4rem', margin: '8px 0' }}>{t('title')}</h1>
      {token ? <Request token={token} /> : <Invalid />}
    </main>
  );
}

function Request({ token }: { token: string }) {
  const state = useLoad(getInfoRequest, token);
  return (
    <Remote state={state}>
      {(request) =>
        request ? <Reply token={token} request={request} /> : <Invalid />
      }
    </Remote>
  );
}

function Invalid() {
  const t = useTranslations('reply');
  return (
    <div role="status">
      <h2 style={{ fontSize: '1.1rem' }}>{t('invalidLink.title')}</h2>
      <p>{t('invalidLink.body')}</p>
      <Link href="/contact">{t('invalidLink.contact')}</Link>
    </div>
  );
}

function Reply({ token, request }: { token: string; request: InfoRequest }) {
  const t = useTranslations('reply');
  const tSubmit = useTranslations('submit');
  const format = useFormatter();
  const locale = useLocale();
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'sending' | 'invalid' | 'limited' | 'error' | 'gone' | 'done'
  >('idle');
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (status === 'done') headingRef.current?.focus();
  }, [status]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 2) return setStatus('invalid');
    setStatus('sending');
    try {
      await sendReply(token, message.trim());
      setStatus('done');
    } catch (err) {
      if (isRateLimited(err)) setStatus('limited');
      else if (err instanceof ApiRequestError && err.status === 404)
        setStatus('gone');
      else setStatus('error');
    }
  }

  if (status === 'gone') return <Invalid />;

  if (status === 'done') {
    return (
      <div className={s.done}>
        <span className={s.heart} aria-hidden="true">
          ♥
        </span>
        <h2 ref={headingRef} tabIndex={-1}>
          {t('done.title')}
        </h2>
        <p>{t('done.body')}</p>
        <Link href="/" className={`${s.btn} ${s.primary} ${s.backLink}`}>
          {t('done.back')}
        </Link>
      </div>
    );
  }

  const sending = status === 'sending';
  const problem =
    status === 'invalid' || status === 'limited' || status === 'error';

  return (
    <form onSubmit={send} noValidate>
      <p className={s.intro}>
        {request.name ? t('intro', { name: request.name }) : t('introNoName')}
      </p>
      <div className={s.card}>
        <p className={s.label}>{t('note')}</p>
        <p className={s.summary}>{request.note}</p>
      </div>
      <p className={s.small}>
        {t('deadline', {
          date: format.dateTime(new Date(request.deadline), {
            dateStyle: 'long',
          }),
        })}
      </p>
      <div className={s.field}>
        <label htmlFor="reply-message" className={s.label}>
          {t('message')}
        </label>
        <textarea
          id="reply-message"
          lang={locale}
          rows={6}
          maxLength={MAX}
          className={`${s.textarea} ${status === 'invalid' ? s.invalid : ''}`}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (status !== 'sending') setStatus('idle');
          }}
          aria-invalid={status === 'invalid' || undefined}
          aria-describedby="reply-hint"
        />
        <p id="reply-hint" className={s.small}>
          {t('hint')}
        </p>
      </div>
      {problem && (
        <p role="alert" className={s.error}>
          {status === 'limited' ? tSubmit('limited') : t(status)}
        </p>
      )}
      <p className={s.small}>
        {t('consent')} <Link href="/privacy">{t('privacy')}</Link>
      </p>
      <div className={s.actions}>
        <button
          type="submit"
          className={`${s.btn} ${s.primary}`}
          disabled={sending}
          aria-busy={sending}
        >
          {sending && <Spinner />}
          {sending ? t('sending') : t('submit')}
        </button>
      </div>
      <SlowNotice active={sending} kind="send" className={s.small} />
    </form>
  );
}
