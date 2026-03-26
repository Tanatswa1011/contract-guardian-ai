import { cn } from '@/lib/utils';

interface LogoIconProps {
  className?: string;
}

export function LogoIcon({ className = 'h-6 w-6' }: LogoIconProps) {
  return (
    <svg
      viewBox="0 0 100 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
    >
      {/* Shield outline */}
      <path
        d="M50 4L8 22v30c0 28 18 48 42 54 24-6 42-26 42-54V22L50 4z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="3"
      />
      {/* Document with folded corner */}
      <rect x="28" y="18" width="32" height="38" rx="2" fill="none" stroke="white" strokeWidth="2.5" />
      <path d="M48 18v12h12" fill="currentColor" stroke="white" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M48 18l12 12" stroke="white" strokeWidth="2.5" />
      {/* Lock body */}
      <rect x="37" y="35" width="14" height="12" rx="2" fill="white" />
      {/* Lock shackle */}
      <path
        d="M40 35v-4a4 4 0 018 0v4"
        stroke="white"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Keyhole */}
      <circle cx="44" cy="40" r="2" fill="currentColor" />
      <rect x="43" y="41" width="2" height="3" rx="0.5" fill="currentColor" />
      {/* Layered lines at bottom (contract layers) */}
      <path d="M20 78 Q50 92 80 78" stroke="white" strokeWidth="2.5" fill="none" />
      <path d="M24 84 Q50 96 76 84" stroke="white" strokeWidth="2.2" fill="none" opacity="0.75" />
      <path d="M28 90 Q50 100 72 90" stroke="white" strokeWidth="2" fill="none" opacity="0.5" />
    </svg>
  );
}

interface LogoFullProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LogoFull({ className = '', size = 'md' }: LogoFullProps) {
  const sizeMap = {
    sm: { icon: 'h-5 w-5', text: 'text-xs', ai: 'text-[10px]', gap: 'gap-1.5' },
    md: { icon: 'h-7 w-7', text: 'text-sm', ai: 'text-xs', gap: 'gap-2' },
    lg: { icon: 'h-9 w-9', text: 'text-base', ai: 'text-sm', gap: 'gap-2.5' },
  };
  const s = sizeMap[size];

  return (
    <span className={cn('flex items-center', s.gap, className)}>
      <LogoIcon className={s.icon} />
      <span className="flex flex-col leading-none">
        <span className={cn(s.text, 'font-extrabold tracking-[0.08em] uppercase text-foreground')}>
          ContractGuard
        </span>
        <span className={cn(s.ai, 'font-medium tracking-[0.25em] uppercase text-muted-foreground')}>
          AI
        </span>
      </span>
    </span>
  );
}
