import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  active: 'bg-secondary text-foreground border-border',
  archived: 'bg-muted text-muted-foreground border-border',
  expired: 'bg-destructive/10 text-destructive border-border',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn('text-xs font-medium capitalize', statusStyles[status] || statusStyles.draft)}>
      {status}
    </Badge>
  );
}
