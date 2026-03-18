import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function RequireWorkspace() {
  const { hasWorkspace, isLoading, refreshMemberships } = useWorkspace();
  const [hasVerified, setHasVerified] = useState(false);

  useEffect(() => {
    if (isLoading || hasWorkspace) {
      return;
    }

    // Memberships came back empty — force one refetch to rule out stale cache
    let active = true;
    refreshMemberships().finally(() => {
      if (active) setHasVerified(true);
    });
    return () => { active = false; };
  }, [isLoading, hasWorkspace, refreshMemberships]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Still waiting for the verification refetch
  if (!hasWorkspace && !hasVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasWorkspace) {
    return <Navigate to="/create-workspace" replace />;
  }

  return <Outlet />;
}
