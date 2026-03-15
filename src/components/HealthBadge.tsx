import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface HealthBadgeProps {
  label: string;
  variant: 'ok' | 'warning' | 'danger' | 'info';
}

const variantStyles: Record<string, string> = {
  ok: 'bg-secondary text-secondary-foreground border-border',
  warning: 'bg-secondary text-foreground border-border',
  danger: 'bg-destructive text-destructive-foreground border-border',
  info: 'bg-muted text-muted-foreground border-border',
};

export function HealthBadge({ label, variant }: HealthBadgeProps) {
  return (
    <Badge className={cn('text-xs font-medium', variantStyles[variant])}>
      {label}
    </Badge>
  );
}
