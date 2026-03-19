import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function RequireWorkspace() {
  const { hasWorkspace, isResolved, currentWorkspaceId, memberships } = useWorkspace();

  if (!isResolved) {
    console.log('[RequireWorkspace] waiting for workspace resolution before routing decision', {
      membershipCount: memberships.length,
      currentWorkspaceId,
    });
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasWorkspace) {
    console.log('[RequireWorkspace] redirecting to /create-workspace because memberships resolved empty', {
      membershipCount: memberships.length,
      currentWorkspaceId,
    });
    return <Navigate to="/create-workspace" replace />;
  }

  console.log('[RequireWorkspace] workspace membership found; allowing protected workspace routes', {
    membershipCount: memberships.length,
    currentWorkspaceId,
  });
  return <Outlet />;
}
