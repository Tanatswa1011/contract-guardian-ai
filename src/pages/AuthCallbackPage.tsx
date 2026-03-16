import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'confirmed' | 'error'>('loading');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        setStatus('confirmed');
      } else if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password', { replace: true });
      }
    });

    // Timeout fallback
    const timeout = setTimeout(() => {
      setStatus((prev) => (prev === 'loading' ? 'confirmed' : prev));
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] py-12">
        <Card className="mx-4 w-full max-w-md">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Verifying your email…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] py-12">
      <Card className="mx-4 w-full max-w-md">
        <CardContent className="pt-8 pb-6 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Email confirmed</h2>
          <p className="text-sm text-muted-foreground">
            Your email has been verified. You can now sign in to ContractGuardAI.
          </p>
          <Link to="/login">
            <Button className="mt-2">Sign In</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
