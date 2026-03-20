import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, CheckCircle2 } from 'lucide-react';

interface WaitlistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: string;
}

export default function WaitlistModal({ open, onOpenChange, source = 'pricing_page' }: WaitlistModalProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? '');
  const [workspaceName, setWorkspaceName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<'new' | 'existing' | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError('');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('join-pro-waitlist', {
        body: {
          email: email.trim().toLowerCase(),
          workspace_name: workspaceName.trim() || null,
          source,
        },
      });

      if (fnError) {
        setError('Something went wrong. Please try again.');
        setSubmitting(false);
        return;
      }

      if (data?.already_exists) {
        setResult('existing');
      } else {
        setResult('new');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    }

    setSubmitting(false);
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setTimeout(() => {
        setResult(null);
        setError('');
      }, 300);
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        {result ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-foreground" />
            <DialogHeader className="items-center">
              <DialogTitle className="text-xl">
                {result === 'new' ? "You're on the list 🎉" : "You're already on the waitlist"}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {result === 'new'
                  ? "Check your email — we've sent you a confirmation with your 50% discount details."
                  : "We already have your email. We'll notify you when Pro launches with your 50% discount."}
              </DialogDescription>
            </DialogHeader>
            <Button variant="outline" onClick={() => handleClose(false)} className="mt-2">
              Close
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-foreground" />
                <DialogTitle>Get early access to Pro</DialogTitle>
              </div>
              <DialogDescription>
                Be among the first users and get 50% off your first month when Pro launches.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="waitlist-email">Email</Label>
                <Input
                  id="waitlist-email"
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="waitlist-workspace">Company / Workspace name</Label>
                <Input
                  id="waitlist-workspace"
                  placeholder="Optional"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Joining…' : 'Join waitlist'}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
