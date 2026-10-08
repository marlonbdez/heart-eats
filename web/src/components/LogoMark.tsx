import { useId } from 'react';

// Versión simple del logo para la interfaz: el corazón con mordisco, de un solo
// color (el del texto que lo rodea). La galleta completa, con masa y pepitas,
// vive en app/icon.svg y app/apple-icon.png (docs/adr/0004-logo.md).
const HEART_PATH =
  'M12 21C5 16 2 12.5 2 8.5 2 5.5 4.3 3.5 7 3.5c2 0 3.8 1.1 5 3 1.2-1.9 3-3 5-3 2.7 0 5 2 5 5 0 4-3 7.5-10 12.5z';

export function LogoMark({ size = 28 }: { size?: number }) {
  // Cada instancia necesita su propio id: la máscara hace el mordisco.
  const bite = useId();
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <mask id={bite}>
        <rect width="64" height="64" fill="#fff" />
        <circle cx="55" cy="16" r="7.5" />
        <circle cx="47.5" cy="9" r="6.5" />
        <circle cx="59" cy="26" r="6" />
      </mask>
      <path
        mask={`url(#${bite})`}
        transform="translate(1.4 3) scale(2.6)"
        d={HEART_PATH}
        fill="currentColor"
      />
    </svg>
  );
}
