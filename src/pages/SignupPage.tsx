import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signUp(email, password, name);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account created. Check your email to confirm, or sign in if email confirmation is disabled.');
      navigate('/app');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] py-12">
      <Card className="w-full max-w-sm mx-4">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex items-center gap-2 font-semibold text-sm">
            <Shield className="h-4 w-4" />
            ContractGuard
          </div>
          <CardTitle className="text-lg tracking-tight">Create your account</CardTitle>
          <CardDescription className="text-xs">Start your free trial &mdash; no credit card required</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs">Full Name</Label>
              <Input id="name" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required disabled={loading} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Work Email</Label>
              <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs">Password</Label>
              <Input id="password" type="password" placeholder="Min 8 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} disabled={loading} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Start Free Trial
            </Button>
          </form>
          <p className="text-center text-xs text-muted-foreground mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-foreground font-medium hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
