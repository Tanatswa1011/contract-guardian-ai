import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  draft: 'border-border bg-secondary text-muted-foreground',
  active: 'border-foreground bg-foreground text-background',
  archived: 'border-border bg-muted text-muted-foreground',
  expired: 'border-destructive/20 bg-destructive/10 text-destructive',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn('text-xs font-medium capitalize', statusStyles[status] || statusStyles.draft)}>
      {status}
    </Badge>
  );
}
