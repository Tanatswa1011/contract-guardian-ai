import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function CreateWorkspacePage() {
  const navigate = useNavigate();
  const { createWorkspace, hasWorkspace, isLoading, isResolved } = useWorkspace();
  const [workspaceName, setWorkspaceName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  console.log('[CreateWorkspacePage] render', { hasWorkspace, isLoading, isResolved });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      await createWorkspace(workspaceName);
      toast.success('Workspace created successfully.');
      navigate('/app', { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create workspace.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !isResolved) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user already has a workspace, send them to the dashboard
  if (hasWorkspace) {
    console.log('[CreateWorkspacePage] user already has workspace, redirecting to /app');
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex items-center gap-2 text-xl font-semibold">
            <Shield className="h-6 w-6 text-foreground" />
            ContractGuardAI
          </div>
          <CardTitle className="text-2xl font-semibold">Create a workspace</CardTitle>
          <CardDescription>
            Create your first workspace to start uploading and tracking contracts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace Name</Label>
              <Input
                id="workspace-name"
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                placeholder="e.g., Acme Legal"
                autoFocus
                disabled={isSubmitting}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting || !workspaceName.trim()}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Workspace
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
