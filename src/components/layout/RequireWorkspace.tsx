import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function RequireWorkspace() {
  const { hasWorkspace, isResolved, isLoading, memberships, currentWorkspaceId } = useWorkspace();

  console.log('[RequireWorkspace] render', {
    isResolved,
    isLoading,
    hasWorkspace,
    membershipCount: memberships.length,
    currentWorkspaceId,
  });

  if (!isResolved) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasWorkspace) {
    console.log('[RequireWorkspace] redirecting to /create-workspace: no memberships after full resolution');
    return <Navigate to="/create-workspace" replace />;
  }

  return <Outlet />;
}
