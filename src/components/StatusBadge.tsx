import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  active: 'bg-success/10 text-success border-success/20',
  archived: 'bg-muted text-muted-foreground border-border',
  expired: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn('text-xs font-medium capitalize', statusStyles[status] || statusStyles.draft)}>
      {status}
    </Badge>
  );
}
