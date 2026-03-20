import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2, CheckCircle, Mail } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { validatePassword, PASSWORD_HINT } from '@/lib/passwordValidation';
import { Separator } from '@/components/ui/separator';

export default function SignupPage() {
  const [searchParams] = useSearchParams();
  const inviteEmail = searchParams.get('invite_email') || '';
  const [email, setEmail] = useState(inviteEmail);
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { signUp, signInWithGoogle } = useAuth();

  const handleGoogleSignUp = async () => {
    if (googleLoading || loading) return;
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setGoogleLoading(false);
      toast.error('Could not connect to Google. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const pwError = validatePassword(password);
    if (pwError) {
      toast.error(pwError);
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, name, workspaceName.trim() || 'My Workspace');
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] py-12">
        <Card className="mx-4 w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-2">
              <CheckCircle className="h-12 w-12 text-foreground" />
            </div>
            <CardTitle className="text-2xl">Check your email</CardTitle>
            <CardDescription>
              We've sent a verification link to <span className="font-medium text-foreground">{email}</span>. Click the link to activate your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/login">
              <Button variant="outline" className="w-full">Back to Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] py-12">
      <Card className="mx-4 w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex items-center gap-2 text-xl font-semibold">
            <Shield className="h-6 w-6 text-foreground" />
            ContractGuardAI
          </div>
          <CardTitle className="text-2xl font-semibold">Create your account</CardTitle>
          <CardDescription>Start tracking contract deadlines in minutes</CardDescription>
          {inviteEmail && (
            <div className="mt-2 flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0" />
              You've been invited to join a workspace.
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignUp}
            disabled={googleLoading || loading}
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="Jane Smith" value={name} onChange={e => setName(e.target.value)} required disabled={loading} autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput id="password" placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} autoComplete="new-password" />
              <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
            </div>
            {!inviteEmail && (
              <div className="space-y-2">
                <Label htmlFor="workspace">Workspace Name <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input id="workspace" placeholder="e.g., Acme Legal" value={workspaceName} onChange={e => setWorkspaceName(e.target.value)} disabled={loading} />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading || googleLoading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Account
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link to={inviteEmail ? `/login?invite_email=${encodeURIComponent(inviteEmail)}` : '/login'} className="font-medium text-foreground hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
