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

  const value = window.localStorage.getItem(CURRENT_WORKSPACE_STORAGE_KEY);
  console.log('[WorkspaceDebug] readStoredWorkspaceId:', value);
  return value;
};

const writeStoredWorkspaceId = (workspaceId: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  console.log('[WorkspaceDebug] writeStoredWorkspaceId:', workspaceId);
  window.localStorage.setItem(CURRENT_WORKSPACE_STORAGE_KEY, workspaceId);
};

const clearStoredWorkspaceId = () => {
  if (typeof window === 'undefined') {
    return;
  }

  console.log('[WorkspaceDebug] clearStoredWorkspaceId');
  window.localStorage.removeItem(CURRENT_WORKSPACE_STORAGE_KEY);
};

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [currentWorkspaceId, setCurrentWorkspaceIdState] = useState<string | null>(() => readStoredWorkspaceId());
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const querySucceededOnceRef = useRef(false);

  const {
    data: memberships = [],
    isLoading: queryIsLoading,
    isFetching: queryIsFetching,
    isPending: queryIsPending,
    isError: queryIsError,
    error: queryError,
    dataUpdatedAt,
    refetch,
  } = useQuery({
    queryKey: getWorkspaceMembershipsQueryKey(user?.id),
    enabled: !!user,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
    queryFn: async (): Promise<WorkspaceMembership[]> => {
      if (!user) {
        console.log('[WorkspaceDebug] memberships query skipped: no authenticated user');
        return [];
      }

      console.log('[WorkspaceDebug] memberships query start', { userId: user.id });

      await (supabase.rpc as any)('accept_my_pending_workspace_invites').catch((err: unknown) => {
        console.error('[WorkspaceDebug] failed to accept pending workspace invites', err);
      });

      const { data: membershipRows, error: membershipError } = await supabase
        .from('workspace_members')
        .select('workspace_id, role, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (membershipError) {
        console.error('[WorkspaceDebug] workspace_members query FAILED', membershipError);
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
        console.error('[WorkspaceDebug] workspaces query FAILED', workspaceError);
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

      console.log('[WorkspaceDebug] resolved memberships', {
        userId: user.id,
        count: nextMemberships.length,
        memberships: nextMemberships.map((m) => ({ workspaceId: m.workspaceId, role: m.role, name: m.workspace.name })),
      });

      return nextMemberships;
    },
  });

  // Track whether the query has ever completed successfully for this user session.
  // This prevents treating "query hasn't run yet" as "no memberships".
  const queryHasSucceeded = dataUpdatedAt > 0;
  if (queryHasSucceeded && !querySucceededOnceRef.current) {
    querySucceededOnceRef.current = true;
  }

  // The memberships query is "still loading" if:
  // - TanStack Query says isLoading (first fetch in progress)
  // - OR the query is pending and fetching (retry in progress)
  // - OR the user exists but the query has never succeeded yet and is not in a terminal error state
  const membershipQuerySettled = queryHasSucceeded || (queryIsError && !queryIsFetching);
  const effectiveIsLoading = !!user && !membershipQuerySettled;

  const resolvedMemberships = useMemo(
    () => (user ? memberships : []),
    [memberships, user],
  );

  const hasWorkspace = resolvedMemberships.length > 0;

  // isResolved: true when we have enough information to render workspace-scoped content.
  // Requires: auth done, membership query settled (success or terminal error), and either
  // the user has no workspace or we have a selected workspace.
  const isResolved = !authLoading && !effectiveIsLoading && !isCreatingWorkspace && (!hasWorkspace || !!currentWorkspaceId);

  useEffect(() => {
    console.log('[WorkspaceDebug] state snapshot', {
      authLoading,
      userId: user?.id ?? null,
      currentWorkspaceId,
      queryIsLoading,
      queryIsFetching,
      queryIsPending,
      queryIsError,
      queryError: queryIsError ? String(queryError) : null,
      dataUpdatedAt,
      queryHasSucceeded,
      membershipQuerySettled,
      effectiveIsLoading,
      membershipCount: resolvedMemberships.length,
      hasWorkspace,
      isResolved,
      isHydrated,
      isCreatingWorkspace,
      storedWorkspaceId: typeof window !== 'undefined' ? window.localStorage.getItem(CURRENT_WORKSPACE_STORAGE_KEY) : null,
    });
  }, [authLoading, currentWorkspaceId, dataUpdatedAt, effectiveIsLoading, hasWorkspace, isCreatingWorkspace, isHydrated, isResolved, membershipQuerySettled, queryError, queryHasSucceeded, queryIsFetching, queryIsError, queryIsLoading, queryIsPending, resolvedMemberships.length, user?.id]);

  // Main hydration effect: restores currentWorkspaceId after auth + memberships resolve.
  useEffect(() => {
    if (authLoading) {
      console.log('[WorkspaceDebug] hydration: waiting for auth');
      setIsHydrated(false);
      return;
    }

    if (!user) {
      console.log('[WorkspaceDebug] hydration: no user, clearing workspace state');
      setCurrentWorkspaceIdState(null);
      clearStoredWorkspaceId();
      setIsHydrated(true);
      return;
    }

    if (effectiveIsLoading || isCreatingWorkspace) {
      console.log('[WorkspaceDebug] hydration: waiting for memberships to settle', {
        userId: user.id,
        effectiveIsLoading,
        isCreatingWorkspace,
        queryIsLoading,
        queryIsFetching,
        queryIsError,
        membershipQuerySettled,
      });
      setIsHydrated(false);
      return;
    }

    // If the query errored and never succeeded, don't clear workspace state.
    // Keep the stored workspace ID so a retry can restore it.
    if (queryIsError && !queryHasSucceeded) {
      console.warn('[WorkspaceDebug] hydration: memberships query failed, preserving stored workspace state', {
        userId: user.id,
        error: String(queryError),
        storedWorkspaceId: readStoredWorkspaceId(),
      });
      setIsHydrated(true);
      return;
    }

    const storedWorkspaceId = readStoredWorkspaceId();
    console.log('[WorkspaceDebug] hydration: resolving workspace', {
      userId: user.id,
      storedWorkspaceId,
      currentWorkspaceId,
      membershipCount: resolvedMemberships.length,
    });

    if (resolvedMemberships.length === 0) {
      console.log('[WorkspaceDebug] hydration: no memberships after successful query, clearing workspace');
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

    console.log('[WorkspaceDebug] hydration: resolved workspace candidate', {
      userId: user.id,
      storedWorkspaceId,
      currentWorkspaceId,
      nextWorkspaceId,
      validWorkspaceIds: Array.from(validWorkspaceIds),
    });

    if (nextWorkspaceId !== currentWorkspaceId) {
      console.log('[WorkspaceDebug] hydration: updating currentWorkspaceId', {
        previous: currentWorkspaceId,
        next: nextWorkspaceId,
      });
      setCurrentWorkspaceIdState(nextWorkspaceId);
      writeStoredWorkspaceId(nextWorkspaceId);
      // Don't set isHydrated=false here; the next render cycle will re-run this effect
      // with the updated currentWorkspaceId and complete hydration.
      return;
    }

    writeStoredWorkspaceId(nextWorkspaceId);
    console.log('[WorkspaceDebug] hydration: workspace fully restored', {
      userId: user.id,
      currentWorkspaceId: nextWorkspaceId,
    });
    setIsHydrated(true);
  }, [authLoading, currentWorkspaceId, effectiveIsLoading, isCreatingWorkspace, membershipQuerySettled, queryHasSucceeded, queryIsError, queryIsFetching, queryIsLoading, queryError, resolvedMemberships, user]);

  // Secondary safety net: ensure isHydrated becomes true once all conditions are truly met.
  // This catches edge cases where the main effect's state update scheduling misses a beat.
  useEffect(() => {
    if (isHydrated) return;
    if (authLoading || effectiveIsLoading || isCreatingWorkspace) return;
    if (!user) {
      setIsHydrated(true);
      return;
    }
    if (hasWorkspace && !!currentWorkspaceId) {
      console.log('[WorkspaceDebug] safety net: setting isHydrated=true (workspace resolved)');
      setIsHydrated(true);
    } else if (!hasWorkspace && membershipQuerySettled) {
      console.log('[WorkspaceDebug] safety net: setting isHydrated=true (no workspace, query settled)');
      setIsHydrated(true);
    }
  }, [authLoading, currentWorkspaceId, effectiveIsLoading, hasWorkspace, isCreatingWorkspace, isHydrated, membershipQuerySettled, user]);

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
    isLoading: authLoading || (!!user && (effectiveIsLoading || isCreatingWorkspace || (hasWorkspace && !currentWorkspaceId))),
    isHydrated,
    isResolved,
    hasWorkspace,
    setCurrentWorkspaceId,
    refreshMemberships,
    createWorkspace,
  }), [authLoading, createWorkspace, currentMembership, currentWorkspaceId, effectiveIsLoading, hasWorkspace, isCreatingWorkspace, isHydrated, isResolved, refreshMemberships, resolvedMemberships, setCurrentWorkspaceId, user]);

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
