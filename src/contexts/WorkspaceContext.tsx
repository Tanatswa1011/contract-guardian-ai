import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const CURRENT_WORKSPACE_STORAGE_KEY = 'contractguard.currentWorkspaceId';

type WorkspaceSummary = {
  id: string;
  name: string;
  role: string;
};

interface WorkspaceContextType {
  loading: boolean;
  workspaces: WorkspaceSummary[];
  hasWorkspace: boolean;
  currentWorkspaceId: string | null;
  currentWorkspace: WorkspaceSummary | null;
  setCurrentWorkspaceId: (workspaceId: string) => void;
  createWorkspace: (name: string) => Promise<string>;
  refetchWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [currentWorkspaceId, setCurrentWorkspaceIdState] = useState<string | null>(null);

  const workspacesQuery = useQuery({
    queryKey: ['workspace-memberships', user?.id],
    queryFn: async (): Promise<WorkspaceSummary[]> => {
      if (!user) return [];

      const { data: memberships, error: membershipError } = await supabase
        .from('workspace_members')
        .select('workspace_id, role')
        .eq('user_id', user.id);

      if (membershipError) throw membershipError;
      if (!memberships?.length) return [];

      const workspaceIds = memberships.map((membership) => membership.workspace_id);

      const { data: workspaceRows, error: workspaceError } = await supabase
        .from('workspaces')
        .select('id, name')
        .in('id', workspaceIds);

      if (workspaceError) throw workspaceError;

      const workspaceMap = new Map((workspaceRows ?? []).map((workspace) => [workspace.id, workspace.name]));

      return memberships
        .map((membership) => ({
          id: membership.workspace_id,
          role: membership.role,
          name: workspaceMap.get(membership.workspace_id) ?? 'Untitled Workspace',
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!user,
    refetchInterval: (query) => (query.state.data?.length ? false : 3000),
  });

  useEffect(() => {
    if (!user) {
      setCurrentWorkspaceIdState(null);
      localStorage.removeItem(CURRENT_WORKSPACE_STORAGE_KEY);
      return;
    }

    if (workspacesQuery.isLoading) return;

    const availableWorkspaces = workspacesQuery.data ?? [];
    if (!availableWorkspaces.length) {
      setCurrentWorkspaceIdState(null);
      localStorage.removeItem(CURRENT_WORKSPACE_STORAGE_KEY);
      return;
    }

    const savedWorkspaceId = localStorage.getItem(CURRENT_WORKSPACE_STORAGE_KEY);
    const currentWorkspaceStillValid = currentWorkspaceId && availableWorkspaces.some((workspace) => workspace.id === currentWorkspaceId);
    const savedWorkspaceStillValid = savedWorkspaceId && availableWorkspaces.some((workspace) => workspace.id === savedWorkspaceId);

    const nextWorkspaceId = savedWorkspaceStillValid
      ? savedWorkspaceId
      : currentWorkspaceStillValid
        ? currentWorkspaceId
        : availableWorkspaces[0].id;

    if (nextWorkspaceId !== currentWorkspaceId) {
      setCurrentWorkspaceIdState(nextWorkspaceId);
    }

    if (savedWorkspaceId !== nextWorkspaceId) {
      localStorage.setItem(CURRENT_WORKSPACE_STORAGE_KEY, nextWorkspaceId);
    }
  }, [user, workspacesQuery.data, workspacesQuery.isLoading, currentWorkspaceId]);

  const setCurrentWorkspaceId = useCallback((workspaceId: string) => {
    const availableWorkspaces = workspacesQuery.data ?? [];
    if (!availableWorkspaces.some((workspace) => workspace.id === workspaceId)) return;

    setCurrentWorkspaceIdState(workspaceId);
    localStorage.setItem(CURRENT_WORKSPACE_STORAGE_KEY, workspaceId);
  }, [workspacesQuery.data]);

  const createWorkspace = useCallback(async (name: string) => {
    if (!user) throw new Error('You must be signed in to create a workspace.');

    const trimmedName = name.trim();
    if (!trimmedName) throw new Error('Workspace name is required.');

    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({ name: trimmedName, created_by: user.id })
      .select('id')
      .single();

    if (workspaceError) throw workspaceError;

    const { error: membershipError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'owner',
      });

    if (membershipError) throw membershipError;

    await workspacesQuery.refetch();
    setCurrentWorkspaceIdState(workspace.id);
    localStorage.setItem(CURRENT_WORKSPACE_STORAGE_KEY, workspace.id);

    return workspace.id;
  }, [user, workspacesQuery]);

  const refetchWorkspaces = useCallback(async () => {
    await workspacesQuery.refetch();
  }, [workspacesQuery]);

  const value = useMemo<WorkspaceContextType>(() => {
    const workspaces = workspacesQuery.data ?? [];
    return {
      loading: authLoading || workspacesQuery.isLoading,
      workspaces,
      hasWorkspace: workspaces.length > 0,
      currentWorkspaceId,
      currentWorkspace: workspaces.find((workspace) => workspace.id === currentWorkspaceId) ?? null,
      setCurrentWorkspaceId,
      createWorkspace,
      refetchWorkspaces,
    };
  }, [
    authLoading,
    workspacesQuery.data,
    workspacesQuery.isLoading,
    currentWorkspaceId,
    setCurrentWorkspaceId,
    createWorkspace,
    refetchWorkspaces,
  ]);

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
