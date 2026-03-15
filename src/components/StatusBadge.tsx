import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  draft: 'border-border bg-muted text-muted-foreground',
  active: 'border-border bg-accent text-foreground',
  archived: 'border-border bg-secondary text-muted-foreground',
  expired: 'border-destructive/40 bg-destructive/10 text-destructive',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn('normal-case text-xs font-medium capitalize tracking-normal', statusStyles[status] || statusStyles.draft)}>
      {status}
    </Badge>
  );
}
