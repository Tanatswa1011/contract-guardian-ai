import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute() {
  const { user, loading: authLoading } = useAuth();
  const { workspaces, loading: wsLoading } = useWorkspace();
  const location = useLocation();

  if (authLoading || (user && wsLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.email_confirmed_at === null || user.email_confirmed_at === undefined) {
    return <Navigate to="/login" replace />;
  }

  if (workspaces.length === 0 && location.pathname !== '/create-workspace') {
    return <Navigate to="/create-workspace" replace />;
  }

  return <Outlet />;
}
