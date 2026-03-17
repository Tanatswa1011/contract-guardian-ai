import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, Crown, User } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import { useState } from 'react';

export default function WorkspaceSettings() {
  const { user } = useAuth();
  const { currentWorkspace, currentWorkspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['workspace-members', currentWorkspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', currentWorkspaceId!);
      if (error) throw error;

      // Fetch profiles for display names
      const userIds = data.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, notification_email')
        .in('user_id', userIds);

      return data.map(m => {
        const profile = profiles?.find(p => p.user_id === m.user_id);
        return {
          ...m,
          display_name: profile?.display_name || 'Unknown',
          email: profile?.notification_email || '',
        };
      });
    },
    enabled: !!currentWorkspaceId,
  });

  const { data: invites = [] } = useQuery({
    queryKey: ['workspace-invites', currentWorkspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_invites')
        .select('*')
        .eq('workspace_id', currentWorkspaceId!)
        .eq('status', 'pending');
      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspaceId,
  });

  const sendInvite = useMutation({
    mutationFn: async () => {
      const trimmedEmail = inviteEmail.trim().toLowerCase();
      if (!trimmedEmail || !currentWorkspaceId) return;
      const { error } = await supabase
        .from('workspace_invites')
        .insert({
          workspace_id: currentWorkspaceId,
          email: trimmedEmail,
          role: 'member',
          invited_by: user!.id,
        });
      if (error) {
        if (error.code === '23505') throw new Error('This email has already been invited.');
        throw error;
      }

      // Send invitation email via edge function (fire-and-forget, don't block on failure)
      supabase.functions.invoke('send-workspace-invite', {
        body: {
          email: trimmedEmail,
          workspace_id: currentWorkspaceId,
          app_url: window.location.origin,
        },
      }).catch((err) => console.error('Invite email failed:', err));
    },
    onSuccess: () => {
      toast.success('Invitation sent');
      setInviteEmail('');
      queryClient.invalidateQueries({ queryKey: ['workspace-invites', currentWorkspaceId] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to send invitation'),
  });

  if (membersLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentWorkspace) {
    return null;
  }

  const isOwner = currentWorkspace.role === 'owner';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workspace</CardTitle>
          <CardDescription>Your current workspace details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Workspace Name</Label>
            <Input value={currentWorkspace.name} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Your Role</Label>
            <div>
              <Badge variant="secondary" className="normal-case tracking-normal capitalize">
                {currentWorkspace.role}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
          <CardDescription>People in your workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map(member => (
              <div key={member.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    {member.role === 'owner' ? (
                      <Crown className="h-4 w-4 text-foreground" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{member.display_name}</p>
                    {member.email && (
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className="normal-case text-xs tracking-normal capitalize">
                  {member.role}
                </Badge>
              </div>
            ))}

            {invites.map(invite => (
              <div key={invite.id} className="flex items-center justify-between py-2 border-b last:border-0 opacity-60">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">Invitation pending</p>
                  </div>
                </div>
                <Badge variant="outline" className="normal-case text-xs tracking-normal">Pending</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invite Teammate</CardTitle>
            <CardDescription>Send an invitation to join your workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                type="email"
                className="max-w-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => sendInvite.mutate()}
                disabled={sendInvite.isPending || !inviteEmail.trim()}
              >
                {sendInvite.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Invite
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
