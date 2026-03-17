import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEY = 'contractguard_current_workspace';

interface WorkspaceMembership {
  workspace_id: string;
  workspace_name: string;
  role: string;
}

interface WorkspaceContextType {
  currentWorkspaceId: string | null;
  workspaces: WorkspaceMembership[];
  loading: boolean;
  switchWorkspace: (workspaceId: string) => void;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

function getSavedWorkspaceId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveWorkspaceId(id: string | null) {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceMembership[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspaceId(null);
      setLoading(false);
      return;
    }

    try {
      const { data: memberships, error: memErr } = await supabase
        .from('workspace_members')
        .select('workspace_id, role')
        .eq('user_id', user.id);

      if (memErr) throw memErr;

      if (!memberships || memberships.length === 0) {
        setWorkspaces([]);
        setCurrentWorkspaceId(null);
        setLoading(false);
        return;
      }

      const wsIds = memberships.map((m) => m.workspace_id);
      const { data: wsData, error: wsErr } = await supabase
        .from('workspaces')
        .select('id, name')
        .in('id', wsIds);

      if (wsErr) throw wsErr;

      const merged: WorkspaceMembership[] = memberships.map((m) => {
        const ws = wsData?.find((w) => w.id === m.workspace_id);
        return {
          workspace_id: m.workspace_id,
          workspace_name: ws?.name ?? 'Workspace',
          role: m.role,
        };
      });

      setWorkspaces(merged);

      const saved = getSavedWorkspaceId();
      const validSaved = merged.find((w) => w.workspace_id === saved);
      const chosen = validSaved ? saved! : merged[0].workspace_id;
      setCurrentWorkspaceId(chosen);
      saveWorkspaceId(chosen);
    } catch (err) {
      console.error('Failed to load workspaces:', err);
      setWorkspaces([]);
      setCurrentWorkspaceId(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    loadWorkspaces();
  }, [loadWorkspaces]);

  const switchWorkspace = useCallback(
    (workspaceId: string) => {
      const match = workspaces.find((w) => w.workspace_id === workspaceId);
      if (match) {
        setCurrentWorkspaceId(workspaceId);
        saveWorkspaceId(workspaceId);
      }
    },
    [workspaces],
  );

  const refreshWorkspaces = useCallback(async () => {
    await loadWorkspaces();
  }, [loadWorkspaces]);

  const value = useMemo<WorkspaceContextType>(
    () => ({
      currentWorkspaceId,
      workspaces,
      loading,
      switchWorkspace,
      refreshWorkspaces,
    }),
    [currentWorkspaceId, workspaces, loading, switchWorkspace, refreshWorkspaces],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return context;
}
