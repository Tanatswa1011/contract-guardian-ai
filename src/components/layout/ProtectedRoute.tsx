import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    console.log('[AuthDebug] ProtectedRoute waiting for auth resolution');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    console.log('[AuthDebug] ProtectedRoute redirecting to /login because no authenticated user');
    return <Navigate to="/login" replace />;
  }

  if (user.email_confirmed_at === null || user.email_confirmed_at === undefined) {
    console.log('[AuthDebug] ProtectedRoute redirecting to /login because email is unconfirmed', {
      userId: user.id,
    });
    return <Navigate to="/login" replace />;
  }

  console.log('[AuthDebug] ProtectedRoute allowing authenticated route', {
    userId: user.id,
  });
  return <Outlet />;
}
