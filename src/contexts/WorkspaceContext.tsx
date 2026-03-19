import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
  isHydrated: boolean;
  isResolved: boolean;
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

const writeStoredWorkspaceId = (workspaceId: string) => {
  if (typeof window === 'undefined') {
    return;
  }
  console.log('[WorkspaceDebug] localStorage write currentWorkspaceId', { workspaceId });
  window.localStorage.setItem(CURRENT_WORKSPACE_STORAGE_KEY, workspaceId);
};

const clearStoredWorkspaceId = () => {
  if (typeof window === 'undefined') {
    return;
  }
  console.log('[WorkspaceDebug] localStorage remove currentWorkspaceId');
  window.localStorage.removeItem(CURRENT_WORKSPACE_STORAGE_KEY);
};

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [currentWorkspaceId, setCurrentWorkspaceIdState] = useState<string | null>(() => readStoredWorkspaceId());
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const {
    data: memberships = [],
    isLoading,
    isFetched,
    refetch,
  } = useQuery({
    queryKey: getWorkspaceMembershipsQueryKey(user?.id),
    enabled: !!user,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 2000),
    queryFn: async (): Promise<WorkspaceMembership[]> => {
      if (!user) {
        console.log('[WorkspaceDebug] memberships query skipped: no authenticated user');
        return [];
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('[WorkspaceDebug] memberships query: no session in Supabase client, may get empty RLS result');
      }
      console.log('[WorkspaceDebug] memberships query start', { userId: user.id, hasSession: !!session });

      await (supabase.rpc as any)('accept_my_pending_workspace_invites').catch((err: unknown) => {
        console.error('[WorkspaceDebug] failed to accept pending workspace invites', err);
      });

      const { data: membershipRows, error: membershipError } = await supabase
        .from('workspace_members')
        .select('workspace_id, role, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (membershipError) {
        console.error('[WorkspaceDebug] workspace_members query failed', membershipError);
        throw membershipError;
      }

      console.log('[WorkspaceDebug] raw workspace_members result', {
        userId: user.id,
        count: membershipRows?.length ?? 0,
        rows: membershipRows,
      });

      if (!membershipRows?.length) {
        console.log('[WorkspaceDebug] no memberships found for user', { userId: user.id });
        return [];
      }

      const workspaceIds = membershipRows.map((membership) => membership.workspace_id);
      const { data: workspaceRows, error: workspaceError } = await supabase
        .from('workspaces')
        .select('*')
        .in('id', workspaceIds);

      if (workspaceError) {
        console.error('[WorkspaceDebug] workspaces query failed', workspaceError);
        throw workspaceError;
      }

      console.log('[WorkspaceDebug] raw workspaces result', {
        userId: user.id,
        count: workspaceRows?.length ?? 0,
        rows: workspaceRows,
      });

      const workspacesById = new Map(
        (workspaceRows ?? []).map((workspace) => [workspace.id, workspace] as const),
      );

      const nextMemberships = membershipRows.flatMap((membership) => {
        const workspace = workspacesById.get(membership.workspace_id);
        if (!workspace) {
          console.warn('[WorkspaceDebug] membership without matching workspace row', membership);
          return [];
        }

        return [{
          workspaceId: membership.workspace_id,
          role: membership.role,
          createdAt: membership.created_at,
          workspace,
        }];
      });

      console.log('[WorkspaceDebug] resolved memberships count', {
        userId: user.id,
        count: nextMemberships.length,
      });

      return nextMemberships;
    },
  });

  const resolvedMemberships = useMemo(
    () => (user ? memberships : []),
    [memberships, user],
  );

  const hasWorkspace = resolvedMemberships.length > 0;
  const membershipsFetched = isFetched && !!user;
  const isResolved = !authLoading && !isLoading && !isCreatingWorkspace && (!hasWorkspace || !!currentWorkspaceId);

  // Retry memberships when we get empty but have stored workspace id (possible session timing race)
  const hasRetriedEmptyRef = useRef(false);
  useEffect(() => {
    if (!user || !membershipsFetched || resolvedMemberships.length > 0) return;
    const stored = readStoredWorkspaceId();
    if (!stored || hasRetriedEmptyRef.current) return;
    hasRetriedEmptyRef.current = true;
    console.log('[WorkspaceDebug] empty memberships but stored workspace id exists, retrying once', { stored });
    refetch();
  }, [user, membershipsFetched, resolvedMemberships.length, refetch]);

  useEffect(() => {
    console.log('[WorkspaceDebug] auth state', {
      authLoading,
      userId: user?.id ?? null,
      currentWorkspaceId,
    });
  }, [authLoading, currentWorkspaceId, user?.id]);

  useEffect(() => {
    if (authLoading) {
      console.log('[WorkspaceDebug] waiting for auth before restoring workspace');
      setIsHydrated(false);
      return;
    }

    if (!user) {
      console.log('[WorkspaceDebug] no authenticated user, clearing active workspace state');
      setCurrentWorkspaceIdState(null);
      clearStoredWorkspaceId();
      setIsHydrated(true);
      return;
    }

    if (isLoading || isCreatingWorkspace) {
      console.log('[WorkspaceDebug] waiting for workspace memberships to resolve', {
        userId: user.id,
        isLoading,
        isCreatingWorkspace,
      });
      setIsHydrated(false);
      return;
    }

    const storedWorkspaceId = readStoredWorkspaceId();
    console.log('[WorkspaceDebug] localStorage currentWorkspaceId', {
      userId: user.id,
      storedWorkspaceId,
      currentWorkspaceId,
      membershipCount: resolvedMemberships.length,
      isFetched: membershipsFetched,
    });

    if (resolvedMemberships.length === 0) {
      console.log('[WorkspaceDebug] no memberships after full resolution - clearing workspace state');
      setCurrentWorkspaceIdState(null);
      clearStoredWorkspaceId();
      setIsHydrated(true);
      return;
    }

    const validWorkspaceIds = new Set(resolvedMemberships.map((membership) => membership.workspaceId));
    const nextWorkspaceId =
      (currentWorkspaceId && validWorkspaceIds.has(currentWorkspaceId) && currentWorkspaceId)
      || (storedWorkspaceId && validWorkspaceIds.has(storedWorkspaceId) && storedWorkspaceId)
      || resolvedMemberships[0].workspaceId;

    console.log('[WorkspaceDebug] final resolved currentWorkspaceId', {
      userId: user.id,
      storedWorkspaceId,
      currentWorkspaceId,
      nextWorkspaceId,
      validWorkspaceIds: Array.from(validWorkspaceIds),
    });

    if (nextWorkspaceId !== currentWorkspaceId) {
      console.log('[WorkspaceDebug] updating currentWorkspaceId state', {
        previous: currentWorkspaceId,
        next: nextWorkspaceId,
      });
      setCurrentWorkspaceIdState(nextWorkspaceId);
      setIsHydrated(false);
      writeStoredWorkspaceId(nextWorkspaceId);
      return;
    }

    writeStoredWorkspaceId(nextWorkspaceId);
    console.log('[WorkspaceDebug] active workspace fully restored', {
      userId: user.id,
      currentWorkspaceId: nextWorkspaceId,
    });
    setIsHydrated(true);
  }, [authLoading, currentWorkspaceId, isCreatingWorkspace, isLoading, resolvedMemberships, user, membershipsFetched]);

  useEffect(() => {
    if (!authLoading && !isLoading && !isCreatingWorkspace && (!hasWorkspace || !!currentWorkspaceId)) {
      setIsHydrated(true);
    }
  }, [authLoading, currentWorkspaceId, hasWorkspace, isCreatingWorkspace, isLoading]);

  const setCurrentWorkspaceId = useCallback((workspaceId: string) => {
    if (!resolvedMemberships.some((membership) => membership.workspaceId === workspaceId)) {
      console.warn('[WorkspaceDebug] ignored invalid workspace switch attempt', {
        requestedWorkspaceId: workspaceId,
        validWorkspaceIds: resolvedMemberships.map((membership) => membership.workspaceId),
      });
      return;
    }

    console.log('[WorkspaceDebug] switching workspace', {
      previous: currentWorkspaceId,
      next: workspaceId,
    });
    setCurrentWorkspaceIdState(workspaceId);
    writeStoredWorkspaceId(workspaceId);
  }, [currentWorkspaceId, resolvedMemberships]);

  const refreshMemberships = useCallback(async () => {
    console.log('[WorkspaceDebug] refreshing memberships', { userId: user?.id ?? null });
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
    console.log('[WorkspaceDebug] creating workspace', {
      userId: user.id,
      workspaceName: trimmedName,
    });

    try {
      const { data, error } = await (supabase.rpc as any)('create_workspace_with_owner', {
        p_name: trimmedName,
      });

      if (error) {
        console.error('[WorkspaceDebug] create workspace RPC failed', error);
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

      console.log('[WorkspaceDebug] create workspace RPC succeeded', {
        userId: user.id,
        workspaceId: data,
      });

      queryClient.setQueryData<WorkspaceMembership[]>(
        getWorkspaceMembershipsQueryKey(user.id),
        (currentMemberships = []) => currentMemberships.some((membership) => membership.workspaceId === data)
          ? currentMemberships
          : [...currentMemberships, optimisticMembership],
      );

      setCurrentWorkspaceIdState(data);
      writeStoredWorkspaceId(data);

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
    isLoading: authLoading || (!!user && (isLoading || isCreatingWorkspace || (hasWorkspace && !currentWorkspaceId))),
    isHydrated,
    isResolved,
    hasWorkspace,
    setCurrentWorkspaceId,
    refreshMemberships,
    createWorkspace,
  }), [authLoading, createWorkspace, currentMembership, currentWorkspaceId, hasWorkspace, isCreatingWorkspace, isHydrated, isLoading, isResolved, refreshMemberships, resolvedMemberships, setCurrentWorkspaceId, user]);

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
