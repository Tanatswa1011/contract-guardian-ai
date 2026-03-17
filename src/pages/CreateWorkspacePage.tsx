import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

export default function CreateWorkspacePage() {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { refreshWorkspaces } = useWorkspace();
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!name.trim() || !user) return;
    setSubmitting(true);

    try {
      const { data: workspace, error: wsErr } = await supabase
        .from('workspaces')
        .insert({ name: name.trim(), created_by: user.id })
        .select()
        .single();

      if (wsErr) throw wsErr;

      const { error: memErr } = await supabase
        .from('workspace_members')
        .insert({ workspace_id: workspace.id, user_id: user.id, role: 'owner' });

      if (memErr) throw memErr;

      await refreshWorkspaces();
      toast.success('Workspace created!');
      navigate('/app', { replace: true });
    } catch (err) {
      console.error('Create workspace error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <Shield className="h-8 w-8 text-foreground" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Create Your Workspace</h1>
          <p className="text-sm text-muted-foreground">
            A workspace lets you organize contracts and collaborate with your team.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ws-name">Workspace Name</Label>
              <Input
                id="ws-name"
                placeholder="e.g., Acme Legal Team"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !submitting && name.trim() && handleCreate()}
                autoFocus
              />
            </div>
            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={!name.trim() || submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Workspace
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
