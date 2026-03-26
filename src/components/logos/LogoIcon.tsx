import { cn } from '@/lib/utils';

interface LogoIconProps {
  className?: string;
  variant?: 'black' | 'white';
}

/**
 * ContractGuard AI — Icon only (shield with lock, document fold, chevron lines)
 * Matches brand reference. Works at 16px–512px. Pure geometric, no gradients.
 */
export default function LogoIcon({ className, variant = 'black' }: LogoIconProps) {
  const fill = variant === 'white' ? '#ffffff' : '#0a0a0a';

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-label="ContractGuard AI icon"
    >
      {/* Shield body */}
      <path
        d="M32 2L6 14v18c0 16 11 30.5 26 34 15-3.5 26-18 26-34V14L32 2Z"
        fill={fill}
      />
      {/* Inner shield cutout */}
      <path
        d="M32 6L10 16.5v15.5c0 13.6 9.5 26.2 22 29.5 12.5-3.3 22-15.9 22-29.5V16.5L32 6Z"
        fill={variant === 'white' ? '#0a0a0a' : '#ffffff'}
      />

      {/* Document with corner fold */}
      <rect x="22" y="14" width="22" height="26" rx="1" fill="none" stroke={fill} strokeWidth="2" />
      <path d="M36 14h8v8l-8-8Z" fill={fill} />

      {/* Lock body */}
      <rect x="27" y="26" width="10" height="8" rx="1.5" fill={fill} />
      {/* Lock shackle */}
      <path
        d="M29.5 26v-3.5a2.5 2.5 0 0 1 5 0V26"
        fill="none"
        stroke={fill}
        strokeWidth="2"
      />
      {/* Keyhole */}
      <circle cx="32" cy="29.5" r="1.5" fill={variant === 'white' ? '#0a0a0a' : '#ffffff'} />
      <rect x="31.25" y="30" width="1.5" height="2.5" rx="0.5" fill={variant === 'white' ? '#0a0a0a' : '#ffffff'} />

      {/* Chevron contract lines at bottom */}
      <path d="M20 48l12 5 12-5" fill="none" stroke={fill} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 53l10 4 10-4" fill="none" stroke={fill} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 57.5l8 3 8-3" fill="none" stroke={fill} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
