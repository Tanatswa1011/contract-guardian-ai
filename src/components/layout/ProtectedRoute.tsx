import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  console.log('[ProtectedRoute] render', {
    loading,
    userId: user?.id ?? null,
    emailConfirmedAt: user?.email_confirmed_at ?? null,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    console.log('[ProtectedRoute] redirecting to /login: no user');
    return <Navigate to="/login" replace />;
  }

  // Block users who haven't confirmed their email
  if (user.email_confirmed_at === null || user.email_confirmed_at === undefined) {
    console.log('[ProtectedRoute] redirecting to /login: email not confirmed');
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
