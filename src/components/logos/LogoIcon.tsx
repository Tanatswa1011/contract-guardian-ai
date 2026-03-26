import { cn } from '@/lib/utils';

interface LogoIconProps {
  className?: string;
  variant?: 'black' | 'white';
}

/**
 * ContractGuard AI — Refined shield + lock mark.
 * Clean, premium, works 16–512 px. No gradients.
 */
export default function LogoIcon({ className, variant = 'black' }: LogoIconProps) {
  const fg = variant === 'white' ? '#ffffff' : '#0a0a0a';
  const bg = variant === 'white' ? '#0a0a0a' : '#ffffff';

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-label="ContractGuard AI icon"
    >
      {/* Solid shield */}
      <path
        d="M32 3L7 15.5v17.5c0 15.2 10.6 29.2 25 33 14.4-3.8 25-17.8 25-33V15.5L32 3Z"
        fill={fg}
      />

      {/* Lock shackle (arc) */}
      <path
        d="M26 28v-4a6 6 0 0 1 12 0v4"
        stroke={bg}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Lock body */}
      <rect x="23" y="28" width="18" height="14" rx="2.5" fill={bg} />

      {/* Keyhole */}
      <circle cx="32" cy="33.5" r="2.5" fill={fg} />
      <path
        d="M32 35.5v3"
        stroke={fg}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
