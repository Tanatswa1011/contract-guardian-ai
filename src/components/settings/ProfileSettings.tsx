import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setNotificationEmail(profile.notification_email || '');
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName, notification_email: notificationEmail })
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Profile updated');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => toast.error('Failed to update profile'),
  });

  const [resetLoading, setResetLoading] = useState(false);

  const handlePasswordReset = async () => {
    if (!user?.email || resetLoading) return;
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: window.location.origin,
      });
      if (error) {
        toast.error('Could not send reset email. Please try again.');
      } else {
        toast.success('Password reset email sent — check your inbox.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="rounded-md border p-6 space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    );
  }

  const hasChanges =
    displayName !== (profile?.display_name || '') ||
    notificationEmail !== (profile?.notification_email || '');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile Information</CardTitle>
          <CardDescription>Update your display name and contact details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input value={user?.email || ''} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">Your login email cannot be changed here.</p>
          </div>
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label>Notification Email</Label>
            <Input
              value={notificationEmail}
              onChange={e => setNotificationEmail(e.target.value)}
              placeholder="you@company.com"
            />
            <p className="text-xs text-muted-foreground">Reminders will be sent to this address.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateProfile.mutate()}
            disabled={updateProfile.isPending || !hasChanges}
          >
            {updateProfile.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Password</CardTitle>
          <CardDescription>Reset your password via email.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={handlePasswordReset} disabled={resetLoading}>
            {resetLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Send Password Reset Email
          </Button>
        </CardContent>
      </Card>

      <DeleteAccountSection />
    </div>
  );
}
