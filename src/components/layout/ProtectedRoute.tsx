import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  useEffect(() => {
    console.log('[AuthDebug] ProtectedRoute state', {
      loading,
      userId: user?.id ?? null,
      emailConfirmed: Boolean(user?.email_confirmed_at),
    });
  }, [loading, user?.email_confirmed_at, user?.id]);

  if (loading) {
    console.log('[AuthDebug] ProtectedRoute holding render while auth restores');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    console.log('[AuthDebug] ProtectedRoute redirecting to /login because no authenticated user is available');
    return <Navigate to="/login" replace />;
  }

  // Block users who haven't confirmed their email
  if (user.email_confirmed_at === null || user.email_confirmed_at === undefined) {
    console.log('[AuthDebug] ProtectedRoute redirecting to /login because email is not confirmed', {
      userId: user.id,
    });
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
