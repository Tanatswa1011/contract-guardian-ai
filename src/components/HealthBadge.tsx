import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface HealthBadgeProps {
  label: string;
  variant: 'ok' | 'warning' | 'danger' | 'info';
}

const variantStyles: Record<string, string> = {
  ok: 'bg-success text-success-foreground hover:bg-success/80',
  warning: 'bg-warning text-warning-foreground hover:bg-warning/80',
  danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/80',
  info: 'bg-primary/10 text-primary hover:bg-primary/20 border-primary/20',
};

export function HealthBadge({ label, variant }: HealthBadgeProps) {
  return (
    <Badge className={cn('text-xs font-medium', variantStyles[variant])}>
      {label}
    </Badge>
  );
}
