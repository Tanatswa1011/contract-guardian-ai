import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'confirmed' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      // 1. Check for error in URL hash (e.g. expired OTP link)
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const hashError = hashParams.get('error');
      const hashErrorDesc = hashParams.get('error_description');

      if (hashError) {
        setStatus('error');
        setErrorMessage(hashErrorDesc?.replace(/\+/g, ' ') || 'Verification failed. Please try again.');
        return;
      }

      // 2. PKCE flow: exchange code for session
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('Code exchange failed:', error.message);
          setStatus('error');
          setErrorMessage(error.message);
          return;
        }
        window.history.replaceState({}, '', '/auth/callback');
        navigate('/app', { replace: true });
        return;
      }

      // 3. Implicit flow: token is in the hash — Supabase client auto-detects it.
      //    Wait for the session to be established, then redirect.
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (session) {
        navigate('/app', { replace: true });
        return;
      }

      // 4. If no session yet, listen for auth state changes (e.g. email confirmation)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN') {
          navigate('/app', { replace: true });
        } else if (event === 'PASSWORD_RECOVERY') {
          navigate('/reset-password', { replace: true });
        }
      });

      // 5. Timeout fallback — if nothing happens after 10s, show confirmation or error
      const timeout = setTimeout(() => {
        setStatus((prev) => {
          if (prev !== 'loading') return prev;
          // If hash had access_token params but no session, it was likely email confirmation
          if (hash.includes('type=signup') || hash.includes('type=email')) {
            return 'confirmed';
          }
          return 'error';
        });
      }, 10000);

      return () => {
        subscription.unsubscribe();
        clearTimeout(timeout);
      };
    };

    handleCallback();
  }, [navigate]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] py-12">
        <Card className="mx-4 w-full max-w-md">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Verifying your account…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] py-12">
        <Card className="mx-4 w-full max-w-md">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold">Verification failed</h2>
            <p className="text-sm text-muted-foreground">
              {errorMessage || 'We could not verify your account. Please try signing in or request a new confirmation email.'}
            </p>
            <Link to="/login">
              <Button variant="outline" className="mt-2">Go to Sign In</Button>
            </Link>
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
