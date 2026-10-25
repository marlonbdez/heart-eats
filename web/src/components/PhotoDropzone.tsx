'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { PHOTO_TYPES } from '@/lib/image';
import styles from './PhotoDropzone.module.css';

// Dónde se pide una foto: se pulsa para elegirla (en el móvil, de la galería o
// con la cámara) o, con ratón, se arrastra encima. El campo de archivo nativo
// cubre toda la zona, así que el teclado y los lectores de pantalla lo siguen
// usando como siempre. Esto solo recoge el archivo; quien lo usa lo valida.
export function PhotoDropzone({
  id,
  labelledBy,
  describedBy,
  onFile,
}: {
  id: string;
  labelledBy: string; // el título del campo; se le suma el texto de la zona
  describedBy?: string;
  onFile: (file?: File) => void;
}) {
  const t = useTranslations('photo');
  const [over, setOver] = useState(false);
  const allow = (e: React.DragEvent) => {
    e.preventDefault();
    setOver(true);
  };

  return (
    <div
      className={`${styles.zone} ${over ? styles.over : ''}`}
      onDragEnter={allow}
      onDragOver={allow}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFile(e.dataTransfer.files[0]);
      }}
    >
      <input
        id={id}
        type="file"
        accept={PHOTO_TYPES.join(',')}
        className={styles.input}
        aria-labelledby={`${labelledBy} ${id}-cta`}
        aria-describedby={`${id}-hint${describedBy ? ` ${describedBy}` : ''}`}
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        width="28"
        height="28"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7H8l1.2-2h5.6L16 7h2.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
        <circle cx="12" cy="13" r="3.2" />
      </svg>
      <span id={`${id}-cta`} className={styles.cta}>
        {t('choose')}
        <span className={styles.drag}> {t('drag')}</span>
      </span>
      <span id={`${id}-hint`} className={styles.hint}>
        {t('hint')}
      </span>
    </div>
  );
}
