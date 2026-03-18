import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const CURRENT_WORKSPACE_STORAGE_KEY = 'contractguardai.currentWorkspaceId';

type WorkspaceRecord = {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
  updated_at: string;
};

export type WorkspaceMembership = {
  workspaceId: string;
  role: string;
  createdAt: string;
  workspace: WorkspaceRecord;
};

interface WorkspaceContextType {
  memberships: WorkspaceMembership[];
  currentWorkspaceId: string | null;
  currentWorkspace: WorkspaceRecord | null;
  currentMembership: WorkspaceMembership | null;
  isLoading: boolean;
  hasWorkspace: boolean;
  setCurrentWorkspaceId: (workspaceId: string) => void;
  refreshMemberships: () => Promise<void>;
  createWorkspace: (name: string) => Promise<string>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const readStoredWorkspaceId = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(CURRENT_WORKSPACE_STORAGE_KEY);
};

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentWorkspaceId, setCurrentWorkspaceIdState] = useState<string | null>(() => readStoredWorkspaceId());

  const {
    data: memberships = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['workspace-memberships', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<WorkspaceMembership[]> => {
      if (!user) {
        return [];
      }

      // Pending invite acceptance RPC is not available in the current schema.
      // Memberships are fetched directly from workspace_members.

      const { data: membershipRows, error: membershipError } = await supabase
        .from('workspace_members')
        .select('workspace_id, role, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (membershipError) {
        throw membershipError;
      }

      if (!membershipRows?.length) {
        return [];
      }

      const workspaceIds = membershipRows.map((membership) => membership.workspace_id);
      const { data: workspaceRows, error: workspaceError } = await supabase
        .from('workspaces')
        .select('*')
        .in('id', workspaceIds);

      if (workspaceError) {
        throw workspaceError;
      }

      const workspacesById = new Map(
        (workspaceRows ?? []).map((workspace) => [workspace.id, workspace] as const),
      );

      return membershipRows.flatMap((membership) => {
        const workspace = workspacesById.get(membership.workspace_id);
        if (!workspace) {
          return [];
        }

        return [{
          workspaceId: membership.workspace_id,
          role: membership.role,
          createdAt: membership.created_at,
          workspace,
        }];
      });
    },
  });

  const resolvedMemberships = useMemo(
    () => (user ? memberships : []),
    [memberships, user],
  );

  useEffect(() => {
    if (!user) {
      setCurrentWorkspaceIdState(null);
      return;
    }

    if (isLoading) {
      return;
    }

    if (resolvedMemberships.length === 0) {
      setCurrentWorkspaceIdState(null);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(CURRENT_WORKSPACE_STORAGE_KEY);
      }
      return;
    }

    const validWorkspaceIds = new Set(resolvedMemberships.map((membership) => membership.workspaceId));
    const storedWorkspaceId = readStoredWorkspaceId();
    const nextWorkspaceId =
      (currentWorkspaceId && validWorkspaceIds.has(currentWorkspaceId) && currentWorkspaceId)
      || (storedWorkspaceId && validWorkspaceIds.has(storedWorkspaceId) && storedWorkspaceId)
      || resolvedMemberships[0].workspaceId;

    if (nextWorkspaceId !== currentWorkspaceId) {
      setCurrentWorkspaceIdState(nextWorkspaceId);
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CURRENT_WORKSPACE_STORAGE_KEY, nextWorkspaceId);
    }
  }, [currentWorkspaceId, isLoading, resolvedMemberships, user]);

  const setCurrentWorkspaceId = useCallback((workspaceId: string) => {
    if (!resolvedMemberships.some((membership) => membership.workspaceId === workspaceId)) {
      return;
    }

    setCurrentWorkspaceIdState(workspaceId);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CURRENT_WORKSPACE_STORAGE_KEY, workspaceId);
    }
  }, [resolvedMemberships]);

  const refreshMemberships = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const createWorkspace = useCallback(async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Workspace name is required.');
    }

    if (!user) {
      throw new Error('You must be signed in to create a workspace.');
    }

    const { data: newWorkspaceId, error: rpcError } = await supabase
      .rpc('create_workspace_with_owner', { p_name: trimmedName });

    if (rpcError) {
      throw rpcError;
    }

    if (!newWorkspaceId) {
      throw new Error('Workspace creation did not return an ID.');
    }

    await refetch();
    setCurrentWorkspaceIdState(newWorkspaceId);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CURRENT_WORKSPACE_STORAGE_KEY, newWorkspaceId);
    }

    return newWorkspaceId;
  }, [refetch, user]);

  const currentMembership = useMemo(
    () => resolvedMemberships.find((membership) => membership.workspaceId === currentWorkspaceId) ?? null,
    [currentWorkspaceId, resolvedMemberships],
  );

  const value = useMemo<WorkspaceContextType>(() => ({
    memberships: resolvedMemberships,
    currentWorkspaceId,
    currentWorkspace: currentMembership?.workspace ?? null,
    currentMembership,
    isLoading: !!user && (isLoading || (resolvedMemberships.length > 0 && !currentWorkspaceId)),
    hasWorkspace: resolvedMemberships.length > 0,
    setCurrentWorkspaceId,
    refreshMemberships,
    createWorkspace,
  }), [createWorkspace, currentMembership, currentWorkspaceId, isLoading, refreshMemberships, resolvedMemberships, setCurrentWorkspaceId, user]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
}
