import { useId } from 'react';

// Logo de HeartEats: una galleta con forma de corazón y un mordisco
// (docs/adr/0004-logo.md). Es el mismo dibujo que app/icon.svg.
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
      <g mask={`url(#${bite})`}>
        <path
          transform="translate(1.4 3) scale(2.6)"
          d={HEART_PATH}
          fill="#E0A04A"
          stroke="#B4432A"
          strokeWidth="1.6"
        />
      </g>
      <g fill="#6B3A1E">
        <circle cx="21" cy="24" r="3.2" />
        <circle cx="33" cy="33" r="3.2" />
        <circle cx="22" cy="40" r="2.6" />
        <circle cx="40" cy="24" r="2.6" />
      </g>
    </svg>
  );
}
