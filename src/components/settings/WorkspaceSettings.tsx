import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, Crown, User, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function WorkspaceSettings() {
  const { user } = useAuth();
  const { currentMembership, currentWorkspace, refreshMemberships, createWorkspace, isLoading: workspaceLoading } = useWorkspace();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [inviteEmail, setInviteEmail] = useState('');
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);
  const [showDeleteWorkspace, setShowDeleteWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);

  const handleCreateWorkspace = async () => {
    try {
      setIsCreatingWorkspace(true);
      await createWorkspace(newWorkspaceName);
      toast.success('Workspace created! Switched to new workspace.');
      setNewWorkspaceName('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create workspace.');
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['workspace-members', currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', currentWorkspace!.id);
      if (error) throw error;

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
    enabled: !!currentWorkspace?.id,
  });

  const { data: invites = [] } = useQuery({
    queryKey: ['workspace-invites', currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_invites')
        .select('*')
        .eq('workspace_id', currentWorkspace!.id)
        .eq('status', 'pending');
      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace?.id,
  });

  const sendInvite = useMutation({
    mutationFn: async () => {
      const trimmedEmail = inviteEmail.trim().toLowerCase();
      if (!trimmedEmail || !currentWorkspace?.id) return;
      const { error } = await supabase
        .from('workspace_invites')
        .insert({
          workspace_id: currentWorkspace.id,
          email: trimmedEmail,
          role: 'member',
          invited_by: user!.id,
        });
      if (error) {
        if (error.code === '23505') throw new Error('This email has already been invited.');
        throw error;
      }

      supabase.functions.invoke('send-workspace-invite', {
        body: {
          email: trimmedEmail,
          workspace_id: currentWorkspace.id,
          app_url: window.location.origin,
        },
      }).catch((err) => console.error('Invite email failed:', err));
    },
    onSuccess: () => {
      toast.success('Invitation sent');
      setInviteEmail('');
      queryClient.invalidateQueries({ queryKey: ['workspace-invites'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to send invitation'),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', memberId)
        .eq('workspace_id', currentWorkspace!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Member removed');
      setRemoveMemberId(null);
      queryClient.invalidateQueries({ queryKey: ['workspace-members', currentWorkspace?.id] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to remove member');
      setRemoveMemberId(null);
    },
  });

  const deleteWorkspace = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error('No workspace selected.');
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', currentWorkspace.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success('Workspace deleted');
      setShowDeleteWorkspace(false);
      await refreshMemberships();
      navigate('/app', { replace: true });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete workspace');
      setShowDeleteWorkspace(false);
    },
  });

  const memberToRemove = removeMemberId ? members.find(m => m.id === removeMemberId) : null;

  if (workspaceLoading || membersLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentWorkspace || !currentMembership) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No Workspace</CardTitle>
            <CardDescription>You don't have a workspace yet. Create one to get started.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                value={newWorkspaceName}
                onChange={e => setNewWorkspaceName(e.target.value)}
                placeholder="e.g., Acme Legal"
                className="max-w-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateWorkspace}
                disabled={isCreatingWorkspace || !newWorkspaceName.trim()}
              >
                {isCreatingWorkspace && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Create
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwner = currentMembership.role === 'owner';

  return (
    <div className="space-y-6">
      {/* Remove member confirmation */}
      <AlertDialog open={!!removeMemberId} onOpenChange={(open) => { if (!open) setRemoveMemberId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove
                ? `Remove ${memberToRemove.display_name} (${memberToRemove.email}) from this workspace? They will lose access to all workspace data.`
                : 'Remove this member from the workspace?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMember.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeMemberId && removeMember.mutate(removeMemberId)}
              disabled={removeMember.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMember.isPending ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete workspace confirmation */}
      <AlertDialog open={showDeleteWorkspace} onOpenChange={setShowDeleteWorkspace}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the workspace "{currentWorkspace.name}" and all its contracts, deadlines, files, and member associations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteWorkspace.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteWorkspace.mutate()}
              disabled={deleteWorkspace.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteWorkspace.isPending ? 'Deleting…' : 'Delete Workspace'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                {currentMembership.role}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create New Workspace</CardTitle>
          <CardDescription>Start a new workspace for a different team or project.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              value={newWorkspaceName}
              onChange={e => setNewWorkspaceName(e.target.value)}
              placeholder="e.g., Acme Legal"
              className="max-w-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateWorkspace}
              disabled={isCreatingWorkspace || !newWorkspaceName.trim()}
            >
              {isCreatingWorkspace && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create
            </Button>
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
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="normal-case text-xs tracking-normal capitalize">
                    {member.role}
                  </Badge>
                  {isOwner && member.user_id !== user?.id && member.role !== 'owner' && (
                    <button
                      onClick={() => setRemoveMemberId(member.id)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Remove member"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
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

      {isOwner && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
            <CardDescription>Permanently delete this workspace and all its data.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteWorkspace(true)}
            >
              Delete Workspace
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
