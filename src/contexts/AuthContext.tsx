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

const AUTH_DEBUG_PREFIX = '[AuthDebug]';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initialSessionResolvedRef = useRef(false);

  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const applySession = (source: string, nextSession: Session | null) => {
      if (!isMounted) {
        return;
      }

      console.log(`${AUTH_DEBUG_PREFIX} applying session`, {
        source,
        userId: nextSession?.user?.id ?? null,
        hasSession: Boolean(nextSession),
      });
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    };

    // Handle PKCE code exchange from Supabase email links (password reset, email confirm)
    // Supabase redirects to the Site URL with ?code=... — we must exchange it here
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          console.error(`${AUTH_DEBUG_PREFIX} code exchange failed`, error.message);
        }
        // Clean the URL
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        window.history.replaceState({}, '', url.pathname + url.search);
      });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`${AUTH_DEBUG_PREFIX} onAuthStateChange`, {
        event,
        userId: session?.user?.id ?? null,
        hasSession: Boolean(session),
        initialSessionResolved: initialSessionResolvedRef.current,
      });
      applySession(`onAuthStateChange:${event}`, session);

      if (initialSessionResolvedRef.current) {
        setLoading(false);
      } else {
        console.log(`${AUTH_DEBUG_PREFIX} keeping auth loading true until getSession resolves`, {
          event,
        });
      }

      // Redirect to /reset-password when a password recovery link is used
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password', { replace: true });
        return;
      }

    });

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log(`${AUTH_DEBUG_PREFIX} getSession resolved`, {
        userId: session?.user?.id ?? null,
        hasSession: Boolean(session),
        error: error?.message ?? null,
      });
      applySession('getSession', session);
      initialSessionResolvedRef.current = true;
      if (isMounted) {
        setLoading(false);
      }
    }).catch((error: unknown) => {
      console.error(`${AUTH_DEBUG_PREFIX} getSession failed`, error);
      initialSessionResolvedRef.current = true;
      if (isMounted) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const signUp = async (email: string, password: string, displayName: string, workspaceName?: string) => {
    console.log(`${AUTH_DEBUG_PREFIX} signUp requested`, {
      email,
      workspaceName: workspaceName || 'My Workspace',
    });
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
    console.log(`${AUTH_DEBUG_PREFIX} signIn requested`, { email });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    console.log(`${AUTH_DEBUG_PREFIX} signOut requested`, {
      userId: user?.id ?? null,
    });
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
