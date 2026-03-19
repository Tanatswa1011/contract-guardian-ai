import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function RequireWorkspace() {
  const { hasWorkspace, isResolved } = useWorkspace();

  if (!isResolved) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasWorkspace) {
    console.log('[RequireWorkspace] redirect decision: memberships resolved empty, redirecting to create-workspace');
    return <Navigate to="/create-workspace" replace />;
  }

  return <Outlet />;
}
