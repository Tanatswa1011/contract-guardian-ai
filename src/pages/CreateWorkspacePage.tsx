import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

export default function CreateWorkspacePage() {
  const { user } = useAuth();
  const { memberships, membershipsLoading, refetchMemberships, setCurrentWorkspaceId } = useWorkspace();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  // Redirect to app only when user has no workspace and we're blocking app access.
  // Users with workspace can still visit /create-workspace to create additional workspaces.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !user) return;
    setSubmitting(true);
    try {
      const { data: workspace, error: wsError } = await supabase
        .from('workspaces')
        .insert({ name: trimmed, created_by: user.id })
        .select()
        .single();

      if (wsError) throw wsError;

      const { error: memError } = await supabase
        .from('workspace_members')
        .insert({ workspace_id: workspace.id, user_id: user.id, role: 'owner' });

      if (memError) throw memError;

      setCurrentWorkspaceId(workspace.id);
      await refetchMemberships();
      toast.success('Workspace created successfully');
      navigate('/app', { replace: true });
    } catch (err: unknown) {
      console.error('Create workspace error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setSubmitting(false);
    }
  };

  if (membershipsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border bg-muted">
            <Building2 className="h-6 w-6 text-foreground" />
          </div>
          <div className="mx-auto mb-2 flex items-center gap-2 text-lg font-semibold">
            <Shield className="h-5 w-5 text-foreground" />
            ContractGuardAI
          </div>
          <CardTitle className="text-xl">Create your workspace</CardTitle>
          <CardDescription>
            Get started by creating a workspace for your team. You can invite others later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace name</Label>
              <Input
                id="workspace-name"
                placeholder="e.g., Acme Corp"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                required
                className="bg-background"
              />
            </div>
            <Button type="submit" className="w-full" disabled={!name.trim() || submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Workspace
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
