interface LogoIconProps {
  className?: string;
}

export function LogoIcon({ className = 'h-5 w-5' }: LogoIconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M32 2L6 14v20c0 16.57 11.1 31.07 26 34 14.9-2.93 26-17.43 26-34V14L32 2z"
        fill="currentColor"
      />
      <path d="M40 18h6l-6-6v6z" fill="white" opacity="0.9" />
      <path
        d="M40 12v6h6"
        stroke="white"
        strokeWidth="1.5"
        fill="none"
        strokeLinejoin="round"
      />
      <path
        d="M24 12h16l6 6v10a2 2 0 01-2 2H26a2 2 0 01-2-2V14a2 2 0 012-2z"
        stroke="white"
        strokeWidth="1.5"
        fill="none"
      />
      <rect x="27" y="36" width="10" height="8" rx="1.5" fill="white" />
      <path
        d="M30 36v-3a2 2 0 012-2h0a2 2 0 012 2v3"
        stroke="white"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="32" cy="39.5" r="1.2" fill="currentColor" />
      <line x1="22" y1="50" x2="42" y2="50" stroke="white" strokeWidth="1.2" opacity="0.7" />
      <line x1="24" y1="53" x2="40" y2="53" stroke="white" strokeWidth="1.2" opacity="0.5" />
      <line x1="26" y1="56" x2="38" y2="56" stroke="white" strokeWidth="1.2" opacity="0.3" />
    </svg>
  );
}

interface LogoFullProps {
  className?: string;
  iconClassName?: string;
}

export function LogoFull({ className = '', iconClassName = 'h-5 w-5' }: LogoFullProps) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <LogoIcon className={iconClassName} />
      <span className="text-sm font-bold tracking-[0.06em] uppercase text-foreground">
        ContractGuard
        <span className="font-normal opacity-60 ml-0.5">AI</span>
      </span>
    </span>
  );
}
