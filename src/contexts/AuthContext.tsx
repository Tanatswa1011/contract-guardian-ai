import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string, workspaceName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initialSessionResolvedRef = useRef(false);

  const navigate = useNavigate();

  useEffect(() => {
    // Handle PKCE code exchange from Supabase email links (password reset, email confirm)
    // Supabase redirects to the Site URL with ?code=... — we must exchange it here
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          console.error('Code exchange failed:', error.message);
        }
        // Clean the URL
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        window.history.replaceState({}, '', url.pathname + url.search);
      });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (initialSessionResolvedRef.current) {
        setLoading(false);
      }

      // Redirect to /reset-password when a password recovery link is used
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password', { replace: true });
        return;
      }

    });

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('[AuthDebug] getSession failed', error);
      }

      console.log('[AuthDebug] getSession resolved', {
        hasSession: !!session,
        userId: session?.user?.id ?? null,
      });
      setSession(session);
      setUser(session?.user ?? null);
      initialSessionResolvedRef.current = true;
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    console.log('[AuthDebug] auth loading state', {
      loading,
      hasSession: !!session,
      userId: user?.id ?? null,
    });
  }, [loading, session, user?.id]);

  const signUp = async (email: string, password: string, displayName: string, workspaceName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, workspace_name: workspaceName || 'My Workspace' },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
