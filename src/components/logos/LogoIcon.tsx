import { cn } from '@/lib/utils';

interface LogoIconProps {
  className?: string;
  variant?: 'black' | 'white';
}

/**
 * ContractGuard AI — Icon only (shield with lock, document fold, contract lines)
 * Works at 16px–512px. Pure geometric, no gradients.
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
      {/* Shield outline */}
      <path
        d="M32 4L8 16v16c0 14.4 10.24 27.84 24 32 13.76-4.16 24-17.6 24-32V16L32 4Z"
        fill={fill}
      />
      {/* Inner shield cut — creates border effect */}
      <path
        d="M32 8L12 18.4v13.6c0 12.48 8.8 24.16 20 27.84 11.2-3.68 20-15.36 20-27.84V18.4L32 8Z"
        fill={variant === 'white' ? '#0a0a0a' : '#ffffff'}
      />

      {/* Document corner fold (top-right) */}
      <path
        d="M40 18h6v6l-6-6Z"
        fill={fill}
      />
      <path
        d="M24 18h16l6 6v20H24V18Z"
        fill="none"
        stroke={fill}
        strokeWidth="1.8"
      />

      {/* Lock body */}
      <rect x="29" y="32" width="6" height="5" rx="0.5" fill={fill} />
      {/* Lock shackle */}
      <path
        d="M30.5 32v-2.5a1.5 1.5 0 0 1 3 0V32"
        fill="none"
        stroke={fill}
        strokeWidth="1.5"
      />

      {/* Contract lines (bottom of document) */}
      <line x1="27" y1="40" x2="37" y2="40" stroke={fill} strokeWidth="1.2" />
      <line x1="27" y1="42.5" x2="35" y2="42.5" stroke={fill} strokeWidth="1.2" />
    </svg>
  );
}
