import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface HealthBadgeProps {
  label: string;
  variant: 'ok' | 'warning' | 'danger' | 'info';
}

const variantStyles: Record<string, string> = {
  ok: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-destructive/10 text-destructive',
  info: 'bg-muted text-muted-foreground border-border',
};

export function HealthBadge({ label, variant }: HealthBadgeProps) {
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', variantStyles[variant])}>
      {label}
    </Badge>
  );
}
