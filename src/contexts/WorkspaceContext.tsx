import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const CURRENT_WORKSPACE_STORAGE_KEY = 'contractguardai.currentWorkspaceId';

const getWorkspaceMembershipsQueryKey = (userId?: string) => ['workspace-memberships', userId] as const;

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
  const queryClient = useQueryClient();
  const [currentWorkspaceId, setCurrentWorkspaceIdState] = useState<string | null>(() => readStoredWorkspaceId());
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);

  const {
    data: memberships = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: getWorkspaceMembershipsQueryKey(user?.id),
    enabled: !!user,
    queryFn: async (): Promise<WorkspaceMembership[]> => {
      if (!user) {
        return [];
      }

      await (supabase.rpc as any)('accept_my_pending_workspace_invites').catch((err: unknown) => {
        console.error('Failed to accept pending workspace invites:', err);
      });

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

    if (isLoading || isCreatingWorkspace) {
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
  }, [currentWorkspaceId, isCreatingWorkspace, isLoading, resolvedMemberships, user]);

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
    await queryClient.invalidateQueries({ queryKey: getWorkspaceMembershipsQueryKey(user?.id) });
    await refetch();
  }, [queryClient, refetch, user?.id]);

  const createWorkspace = useCallback(async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Workspace name is required.');
    }

    if (!user) {
      throw new Error('You must be signed in to create a workspace.');
    }

    setIsCreatingWorkspace(true);

    try {
      const { data, error } = await (supabase.rpc as any)('create_workspace_with_owner', {
        p_name: trimmedName,
      });

      if (error) {
        throw error;
      }

      if (typeof data !== 'string' || !data) {
        throw new Error('Workspace creation failed. Please try again.');
      }

      const now = new Date().toISOString();
      const optimisticMembership: WorkspaceMembership = {
        workspaceId: data,
        role: 'owner',
        createdAt: now,
        workspace: {
          id: data,
          name: trimmedName,
          created_at: now,
          created_by: user.id,
          updated_at: now,
        },
      };

      queryClient.setQueryData<WorkspaceMembership[]>(
        getWorkspaceMembershipsQueryKey(user.id),
        (currentMemberships = []) => currentMemberships.some((membership) => membership.workspaceId === data)
          ? currentMemberships
          : [...currentMemberships, optimisticMembership],
      );

      setCurrentWorkspaceIdState(data);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(CURRENT_WORKSPACE_STORAGE_KEY, data);
      }

      await queryClient.invalidateQueries({ queryKey: getWorkspaceMembershipsQueryKey(user.id) });
      await refetch();

      return data;
    } finally {
      setIsCreatingWorkspace(false);
    }
  }, [queryClient, refetch, user]);

  const currentMembership = useMemo(
    () => resolvedMemberships.find((membership) => membership.workspaceId === currentWorkspaceId) ?? null,
    [currentWorkspaceId, resolvedMemberships],
  );

  const value = useMemo<WorkspaceContextType>(() => ({
    memberships: resolvedMemberships,
    currentWorkspaceId,
    currentWorkspace: currentMembership?.workspace ?? null,
    currentMembership,
    isLoading: !!user && (isLoading || isCreatingWorkspace),
    hasWorkspace: resolvedMemberships.length > 0,
    setCurrentWorkspaceId,
    refreshMemberships,
    createWorkspace,
  }), [createWorkspace, currentMembership, currentWorkspaceId, isCreatingWorkspace, isLoading, refreshMemberships, resolvedMemberships, setCurrentWorkspaceId, user]);

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
