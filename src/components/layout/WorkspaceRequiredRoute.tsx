import { Navigate, Outlet } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Loader2 } from 'lucide-react';

export default function WorkspaceRequiredRoute() {
  const { memberships, membershipsLoading } = useWorkspace();

  if (membershipsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (memberships.length === 0) {
    return <Navigate to="/create-workspace" replace />;
  }

  return <Outlet />;
}
