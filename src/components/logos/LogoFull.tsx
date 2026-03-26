import { cn } from '@/lib/utils';
import LogoIcon from './LogoIcon';

interface LogoFullProps {
  className?: string;
  variant?: 'black' | 'white';
  iconSize?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * ContractGuard AI — Full horizontal logo (icon + wordmark)
 * Enterprise-grade, black-and-white only.
 */
export default function LogoFull({ className, variant = 'black', iconSize, size = 'md' }: LogoFullProps) {
  const textColor = variant === 'white' ? 'text-white' : 'text-foreground';

  const sizeMap = {
    sm: { icon: 'h-6 w-6', title: 'text-[13px]', subtitle: 'text-[9px]', gap: 'gap-2' },
    md: { icon: 'h-7 w-7', title: 'text-[15px]', subtitle: 'text-[10px]', gap: 'gap-2.5' },
    lg: { icon: 'h-10 w-10', title: 'text-lg', subtitle: 'text-[11px]', gap: 'gap-3' },
  };

  const s = sizeMap[size];

  return (
    <span className={cn('inline-flex items-center', s.gap, className)}>
      <LogoIcon className={iconSize || s.icon} variant={variant} />
      <span className={cn('flex flex-col leading-none', textColor)}>
        <span className={cn(s.title, 'font-bold uppercase tracking-[0.08em] leading-none')}>
          ContractGuard
        </span>
        <span className={cn(s.subtitle, 'font-medium uppercase tracking-[0.25em] leading-none mt-0.5 opacity-40')}>
          AI
        </span>
      </span>
    </span>
  );
}
