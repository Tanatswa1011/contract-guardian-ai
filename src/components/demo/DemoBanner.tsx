import { Shield, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDemo } from '@/contexts/DemoContext';

export default function DemoBanner() {
  const { resetDemo } = useDemo();
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-primary text-primary-foreground">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest">
        <Shield className="h-3.5 w-3.5" />
        <span>Demo Environment</span>
        <span className="opacity-60">·</span>
        <span className="opacity-60">Unlimited Plan</span>
      </div>
      <Button variant="ghost" size="sm" onClick={resetDemo} className="h-7 text-xs text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
        <RotateCcw className="h-3 w-3 mr-1" />
        Reset Demo
      </Button>
    </div>
  );
}
