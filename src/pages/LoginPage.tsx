import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2, Mail } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const inviteEmail = searchParams.get('invite_email') || '';
  const [email, setEmail] = useState(inviteEmail);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message === 'Invalid login credentials'
        ? 'Incorrect email or password. Please try again.'
        : error.message);
    } else {
      navigate('/app');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] py-12">
      <Card className="mx-4 w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex items-center gap-2 text-xl font-semibold">
            <Shield className="h-6 w-6 text-foreground" />
            ContractGuardAI
          </div>
          <CardTitle className="text-2xl font-semibold">Welcome back</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
          {inviteEmail && (
            <div className="mt-2 flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0" />
              You've been invited to join a workspace. Sign in to accept.
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput id="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} autoComplete="current-password" />
            </div>
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground hover:underline">Forgot password?</Link>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Sign In
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{' '}
            <Link to={inviteEmail ? `/signup?invite_email=${encodeURIComponent(inviteEmail)}` : '/signup'} className="font-medium text-foreground hover:underline">Sign up</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
