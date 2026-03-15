import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface HealthBadgeProps {
  label: string;
  variant: 'ok' | 'warning' | 'danger' | 'info';
}

const variantStyles: Record<string, string> = {
  ok: 'border-foreground bg-foreground text-background',
  warning: 'border-border bg-secondary text-foreground',
  danger: 'border-destructive/20 bg-destructive/10 text-destructive',
  info: 'border-border bg-background text-muted-foreground',
};

export function HealthBadge({ label, variant }: HealthBadgeProps) {
  return (
    <Badge className={cn('text-xs font-medium', variantStyles[variant])}>
      {label}
    </Badge>
  );
}
