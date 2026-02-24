import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-success/10 text-success border border-success/20',
  archived: 'bg-muted text-muted-foreground',
  expired: 'bg-destructive/10 text-destructive border border-destructive/20',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn('text-xs font-medium capitalize', statusStyles[status] || statusStyles.draft)}>
      {status}
    </Badge>
  );
}
