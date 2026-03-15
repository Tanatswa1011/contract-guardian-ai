import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface HealthBadgeProps {
  label: string;
  variant: 'ok' | 'warning' | 'danger' | 'info';
}

const variantStyles: Record<string, string> = {
  ok: 'border-border bg-accent text-foreground',
  warning: 'border-border bg-secondary text-foreground',
  danger: 'border-destructive/40 bg-destructive/10 text-destructive',
  info: 'border-border bg-muted text-muted-foreground',
};

export function HealthBadge({ label, variant }: HealthBadgeProps) {
  return (
    <Badge className={cn('normal-case text-xs font-medium tracking-normal', variantStyles[variant])}>
      {label}
    </Badge>
  );
}
