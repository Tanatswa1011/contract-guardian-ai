import { cn } from '@/lib/utils';
import LogoIcon from './LogoIcon';

interface LogoFullProps {
  className?: string;
  variant?: 'black' | 'white';
  iconSize?: string;
}

/**
 * ContractGuard AI — Full horizontal logo (icon + wordmark)
 * Enterprise-grade, black-and-white only.
 */
export default function LogoFull({ className, variant = 'black', iconSize = 'h-6 w-6' }: LogoFullProps) {
  const textColor = variant === 'white' ? 'text-white' : 'text-foreground';

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoIcon className={iconSize} variant={variant} />
      <span className={cn('flex items-baseline gap-0.5 tracking-tight', textColor)}>
        <span className="text-sm font-bold uppercase leading-none">ContractGuard</span>
        <span className="text-[10px] font-medium uppercase leading-none opacity-60">AI</span>
      </span>
    </span>
  );
}
