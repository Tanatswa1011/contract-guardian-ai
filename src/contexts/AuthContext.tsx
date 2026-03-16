import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const acceptPendingInvites = async (u: User) => {
    try {
      const email = u.email;
      if (!email) return;

      const { data: invites } = await supabase
        .from('workspace_invites')
        .select('id, workspace_id, role')
        .eq('email', email.toLowerCase())
        .eq('status', 'pending');

      if (!invites?.length) return;

      for (const inv of invites) {
        await supabase
          .from('workspace_members')
          .upsert(
            { workspace_id: inv.workspace_id, user_id: u.id, role: inv.role },
            { onConflict: 'workspace_id,user_id' }
          );

        await supabase
          .from('workspace_invites')
          .update({ status: 'accepted', accepted_at: new Date().toISOString() })
          .eq('id', inv.id);
      }
    } catch {
      // Silent fail — invites will be retried on next login
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Accept pending workspace invites on sign-in
      if (event === 'SIGNED_IN' && session?.user) {
        setTimeout(() => acceptPendingInvites(session.user), 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: window.location.origin,
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
