import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface EnterpriseInquiryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: string;
}

export default function EnterpriseInquiryModal({ open, onOpenChange, source = 'pricing_page' }: EnterpriseInquiryModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [companyName, setCompanyName] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name || !companyName) return;
    setSubmitting(true);
    setError('');

    const { error: insertError } = await supabase.from('enterprise_inquiries').insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      company_name: companyName.trim(),
      team_size: teamSize.trim() || null,
      message: message.trim() || null,
      source,
    });

    setSubmitting(false);
    if (insertError) {
      setError('Something went wrong. Please try again.');
      return;
    }
    setSubmitted(true);
  };

  const handleClose = (val: boolean) => {
    onOpenChange(val);
    if (!val) {
      setTimeout(() => {
        setSubmitted(false);
        setError('');
      }, 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle className="h-10 w-10 text-foreground" />
            <DialogTitle className="text-lg font-semibold">Thanks for reaching out</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              We'll review your inquiry and get back to you soon.
            </DialogDescription>
            <Button variant="outline" className="mt-2" onClick={() => handleClose(false)}>
              Close
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Enterprise inquiry</DialogTitle>
              <DialogDescription>
                Tell us about your team and we'll put together a custom plan.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ent-name">Full name</Label>
                <Input id="ent-name" value={name} onChange={e => setName(e.target.value)} required placeholder="Jane Miller" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ent-email">Work email</Label>
                <Input id="ent-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="jane@company.com" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ent-company">Company name</Label>
                <Input id="ent-company" value={companyName} onChange={e => setCompanyName(e.target.value)} required placeholder="Acme Corp" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ent-size">Team size <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Input id="ent-size" value={teamSize} onChange={e => setTeamSize(e.target.value)} placeholder="e.g. 10–50" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ent-message">Message <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Textarea id="ent-message" value={message} onChange={e => setMessage(e.target.value)} placeholder="Tell us what you're looking for…" className="min-h-[80px]" />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</> : 'Send inquiry'}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
