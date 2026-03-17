import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEY = 'contractguard_current_workspace_id';

export type WorkspaceMembership = {
  workspace_id: string;
  workspace_name: string;
  role: string;
};

interface WorkspaceContextType {
  currentWorkspaceId: string | null;
  setCurrentWorkspaceId: (id: string) => void;
  memberships: WorkspaceMembership[];
  membershipsLoading: boolean;
  refetchMemberships: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<WorkspaceMembership[]>([]);
  const [membershipsLoading, setMembershipsLoading] = useState(true);
  const [currentWorkspaceId, setCurrentWorkspaceIdState] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const fetchMemberships = useCallback(async () => {
    if (!user) {
      setMemberships([]);
      setMembershipsLoading(false);
      return;
    }
    setMembershipsLoading(true);
    try {
      const { data: membershipRows, error: memErr } = await supabase
        .from('workspace_members')
        .select('workspace_id, role')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (memErr) throw memErr;

      if (!membershipRows?.length) {
        setMemberships([]);
        setMembershipsLoading(false);
        setInitialized(true);
        return;
      }

      const workspaceIds = membershipRows.map((m) => m.workspace_id);
      const { data: workspaces, error: wsErr } = await supabase
        .from('workspaces')
        .select('id, name')
        .in('id', workspaceIds);

      if (wsErr) throw wsErr;

      const workspaceMap = new Map((workspaces || []).map((w) => [w.id, w.name]));
      const result: WorkspaceMembership[] = membershipRows.map((m) => ({
        workspace_id: m.workspace_id,
        workspace_name: workspaceMap.get(m.workspace_id) || 'Unknown',
        role: m.role,
      }));

      setMemberships(result);
      setInitialized(true);
    } catch (err) {
      console.error('Failed to fetch workspace memberships:', err);
      setMemberships([]);
    } finally {
      setMembershipsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchMemberships();
  }, [fetchMemberships]);

  useEffect(() => {
    if (!initialized || membershipsLoading) return;

    const savedId = localStorage.getItem(STORAGE_KEY);
    const validIds = new Set(memberships.map((m) => m.workspace_id));

    if (savedId && validIds.has(savedId)) {
      setCurrentWorkspaceIdState(savedId);
    } else if (memberships.length > 0) {
      const firstId = memberships[0].workspace_id;
      setCurrentWorkspaceIdState(firstId);
      localStorage.setItem(STORAGE_KEY, firstId);
    } else {
      setCurrentWorkspaceIdState(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [initialized, membershipsLoading, memberships]);

  const setCurrentWorkspaceId = useCallback((id: string) => {
    setCurrentWorkspaceIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{
        currentWorkspaceId,
        setCurrentWorkspaceId,
        memberships,
        membershipsLoading,
        refetchMemberships: fetchMemberships,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return context;
}
