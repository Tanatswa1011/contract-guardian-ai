import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function RequireWorkspace() {
  const { hasWorkspace, isResolved, currentWorkspaceId, memberships } = useWorkspace();

  useEffect(() => {
    console.log('[RequireWorkspace] state update', {
      isResolved,
      hasWorkspace,
      currentWorkspaceId,
      membershipCount: memberships.length,
    });
  }, [currentWorkspaceId, hasWorkspace, isResolved, memberships.length]);

  if (!isResolved) {
    console.log('[RequireWorkspace] holding workspace route render until hydration finishes');
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasWorkspace) {
    console.log('[RequireWorkspace] redirecting to /create-workspace because the authenticated user has no resolved memberships', {
      currentWorkspaceId,
      membershipCount: memberships.length,
    });
    return <Navigate to="/create-workspace" replace />;
  }

  console.log('[RequireWorkspace] allowing workspace-scoped route render', {
    currentWorkspaceId,
    membershipCount: memberships.length,
  });
  return <Outlet />;
}
