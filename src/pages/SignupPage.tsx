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
        <CardContent>
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
            <Button type="submit" className="w-full" disabled={loading}>
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
