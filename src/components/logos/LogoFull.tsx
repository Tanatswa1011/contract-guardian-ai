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
    sm: { icon: 'h-6 w-6', title: 'text-sm', subtitle: 'text-[9px]' },
    md: { icon: 'h-7 w-7', title: 'text-base', subtitle: 'text-[10px]' },
    lg: { icon: 'h-10 w-10', title: 'text-xl', subtitle: 'text-xs' },
  };

  const s = sizeMap[size];

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoIcon className={iconSize || s.icon} variant={variant} />
      <span className={cn('flex flex-col leading-none', textColor)}>
        <span className={cn(s.title, 'font-extrabold uppercase tracking-wide leading-none')}>
          ContractGuard
        </span>
        <span className={cn(s.subtitle, 'font-medium uppercase tracking-[0.2em] leading-none mt-0.5 opacity-50')}>
          AI
        </span>
      </span>
    </span>
  );
}
