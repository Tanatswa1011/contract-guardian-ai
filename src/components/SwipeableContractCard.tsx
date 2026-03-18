import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';

type SwipeableContractCardProps = {
  contract: {
    id: string;
    title: string | null;
    status: string | null;
    next_deadline_date: string | null;
    health_status: string | null;
  };
  healthVariant: (status: string | null) => 'destructive' | 'secondary' | 'outline' | 'default';
  healthLabel: (status: string | null) => string;
  onDelete: (id: string) => void;
};

export function SwipeableContractCard({ contract, healthVariant, healthLabel, onDelete }: SwipeableContractCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const DELETE_THRESHOLD = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = 0;
    setIsSwiping(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = startXRef.current - e.touches[0].clientX;
    currentXRef.current = diff;

    if (diff > 10) {
      setIsSwiping(true);
    }

    // Only allow swiping left (positive diff), cap at 120px
    const clamped = Math.max(0, Math.min(diff, 120));
    setOffsetX(clamped);
  };

  const handleTouchEnd = () => {
    if (currentXRef.current >= DELETE_THRESHOLD) {
      // Snap open to reveal delete button
      setOffsetX(DELETE_THRESHOLD);
    } else {
      // Snap back
      setOffsetX(0);
    }
    // Reset swiping flag after a tick so the Link click is suppressed
    setTimeout(() => setIsSwiping(false), 50);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(contract.id);
  };

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-lg">
      {/* Delete action behind the card */}
      <div className="absolute inset-y-0 right-0 flex items-center justify-center bg-destructive"
        style={{ width: `${DELETE_THRESHOLD}px` }}
      >
        <button
          onClick={handleDeleteClick}
          className="flex flex-col items-center gap-1 text-destructive-foreground p-3"
        >
          <Trash2 className="h-5 w-5" />
          <span className="text-xs font-medium">Delete</span>
        </button>
      </div>

      {/* Swipeable card */}
      <div
        className="relative z-10 transition-transform duration-200 ease-out"
        style={{ transform: `translateX(-${offsetX}px)`, transitionDuration: currentXRef.current !== 0 ? '0ms' : '200ms' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Link
          to={`/app/contracts/${contract.id}`}
          onClick={(e) => { if (isSwiping || offsetX > 0) e.preventDefault(); }}
        >
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-medium text-sm leading-tight">{contract.title}</p>
                <StatusBadge status={contract.status || 'draft'} />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{contract.next_deadline_date ? `Next: ${new Date(contract.next_deadline_date).toLocaleDateString()}` : 'No upcoming'}</span>
                <Badge variant={healthVariant(contract.health_status)} className="normal-case text-xs capitalize tracking-normal">
                  {healthLabel(contract.health_status)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
