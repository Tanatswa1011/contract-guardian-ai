import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const CURRENT_WORKSPACE_STORAGE_KEY = 'contractguardai.currentWorkspaceId';
const WORKSPACE_DEBUG_PREFIX = '[WorkspaceDebug]';

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

  const workspaceId = window.localStorage.getItem(CURRENT_WORKSPACE_STORAGE_KEY);
  console.log(`${WORKSPACE_DEBUG_PREFIX} localStorage read`, {
    key: CURRENT_WORKSPACE_STORAGE_KEY,
    workspaceId,
  });
  return workspaceId;
};

const writeStoredWorkspaceId = (workspaceId: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  console.log(`${WORKSPACE_DEBUG_PREFIX} localStorage write`, {
    key: CURRENT_WORKSPACE_STORAGE_KEY,
    workspaceId,
  });
  window.localStorage.setItem(CURRENT_WORKSPACE_STORAGE_KEY, workspaceId);
};

const clearStoredWorkspaceId = () => {
  if (typeof window === 'undefined') {
    return;
  }

  console.log(`${WORKSPACE_DEBUG_PREFIX} localStorage remove`, {
    key: CURRENT_WORKSPACE_STORAGE_KEY,
  });
  window.localStorage.removeItem(CURRENT_WORKSPACE_STORAGE_KEY);
};

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [currentWorkspaceId, setCurrentWorkspaceIdState] = useState<string | null>(() => readStoredWorkspaceId());
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const membershipsQuery = useQuery({
    queryKey: getWorkspaceMembershipsQueryKey(user?.id),
    enabled: !authLoading && !!user,
    retry: 2,
    queryFn: async (): Promise<WorkspaceMembership[]> => {
      if (!user) {
        console.log(`${WORKSPACE_DEBUG_PREFIX} memberships query skipped: no authenticated user`);
        return [];
      }

      console.log(`${WORKSPACE_DEBUG_PREFIX} memberships query start`, { userId: user.id });

      await supabase.rpc('accept_my_pending_workspace_invites').catch((err: unknown) => {
        console.error(`${WORKSPACE_DEBUG_PREFIX} failed to accept pending workspace invites`, err);
      });

      const { data: membershipRows, error: membershipError } = await supabase
        .from('workspace_members')
        .select('workspace_id, role, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (membershipError) {
        console.error(`${WORKSPACE_DEBUG_PREFIX} workspace_members query failed`, membershipError);
        throw membershipError;
      }

      console.log(`${WORKSPACE_DEBUG_PREFIX} raw workspace_members query result`, {
        userId: user.id,
        count: membershipRows?.length ?? 0,
        rows: membershipRows ?? [],
      });

      if (!membershipRows?.length) {
        console.log(`${WORKSPACE_DEBUG_PREFIX} no memberships found for user`, { userId: user.id });
        return [];
      }

      const workspaceIds = membershipRows.map((membership) => membership.workspace_id);
      const { data: workspaceRows, error: workspaceError } = await supabase
        .from('workspaces')
        .select('*')
        .in('id', workspaceIds);

      if (workspaceError) {
        console.error(`${WORKSPACE_DEBUG_PREFIX} workspaces query failed`, workspaceError);
        throw workspaceError;
      }

      console.log(`${WORKSPACE_DEBUG_PREFIX} raw workspaces query result`, {
        userId: user.id,
        count: workspaceRows?.length ?? 0,
        rows: workspaceRows ?? [],
      });

      const workspacesById = new Map(
        (workspaceRows ?? []).map((workspace) => [workspace.id, workspace] as const),
      );

      const nextMemberships = membershipRows.flatMap((membership) => {
        const workspace = workspacesById.get(membership.workspace_id);
        if (!workspace) {
          console.warn(`${WORKSPACE_DEBUG_PREFIX} membership without matching workspace row`, membership);
          return [];
        }

        return [{
          workspaceId: membership.workspace_id,
          role: membership.role,
          createdAt: membership.created_at,
          workspace,
        }];
      });

      console.log(`${WORKSPACE_DEBUG_PREFIX} resolved memberships`, {
        userId: user.id,
        count: nextMemberships.length,
        memberships: nextMemberships,
      });

      return nextMemberships;
    },
  });

  const resolvedMemberships = useMemo(
    () => (user ? (membershipsQuery.data ?? []) : []),
    [membershipsQuery.data, user],
  );

  const hasWorkspace = resolvedMemberships.length > 0;
  const membershipsReady = !user || membershipsQuery.isSuccess;
  const isResolved = !authLoading
    && membershipsReady
    && !isCreatingWorkspace
    && (!hasWorkspace || !!currentWorkspaceId);

  useEffect(() => {
    console.log(`${WORKSPACE_DEBUG_PREFIX} auth/loading state`, {
      authLoading,
      membershipsReady,
      membershipsQueryState: {
        isLoading: membershipsQuery.isLoading,
        isFetching: membershipsQuery.isFetching,
        isSuccess: membershipsQuery.isSuccess,
        isError: membershipsQuery.isError,
      },
      userId: user?.id ?? null,
      currentWorkspaceId,
    });
  }, [
    authLoading,
    currentWorkspaceId,
    membershipsQuery.isError,
    membershipsQuery.isFetching,
    membershipsQuery.isLoading,
    membershipsQuery.isSuccess,
    membershipsReady,
    user?.id,
  ]);

  useEffect(() => {
    if (authLoading) {
      console.log(`${WORKSPACE_DEBUG_PREFIX} waiting for auth before restoring workspace`);
      setIsHydrated(false);
      return;
    }

    if (!user) {
      console.log(`${WORKSPACE_DEBUG_PREFIX} no authenticated user, clearing workspace state`);
      if (currentWorkspaceId !== null) {
        console.log(`${WORKSPACE_DEBUG_PREFIX} clearing currentWorkspaceId because user is signed out`, {
          previousWorkspaceId: currentWorkspaceId,
        });
      }
      setCurrentWorkspaceIdState(null);
      clearStoredWorkspaceId();
      setIsHydrated(true);
      return;
    }

    if (isCreatingWorkspace) {
      console.log(`${WORKSPACE_DEBUG_PREFIX} waiting for createWorkspace flow to complete`, {
        userId: user.id,
      });
      setIsHydrated(false);
      return;
    }

    if (!membershipsQuery.isSuccess) {
      if (membershipsQuery.isError) {
        console.error(`${WORKSPACE_DEBUG_PREFIX} waiting because memberships query failed`, membershipsQuery.error);
      } else {
        console.log(`${WORKSPACE_DEBUG_PREFIX} waiting for memberships query to resolve`, {
          userId: user.id,
          isLoading: membershipsQuery.isLoading,
          isFetching: membershipsQuery.isFetching,
        });
      }
      setIsHydrated(false);
      return;
    }

    const storedWorkspaceId = readStoredWorkspaceId();
    console.log(`${WORKSPACE_DEBUG_PREFIX} workspace selection inputs`, {
      userId: user.id,
      storedWorkspaceId,
      currentWorkspaceId,
      membershipCount: resolvedMemberships.length,
      membershipWorkspaceIds: resolvedMemberships.map((membership) => membership.workspaceId),
    });

    if (resolvedMemberships.length === 0) {
      console.log(`${WORKSPACE_DEBUG_PREFIX} memberships resolved empty; marking no-workspace state`, {
        userId: user.id,
      });
      setCurrentWorkspaceIdState(null);
      clearStoredWorkspaceId();
      setIsHydrated(true);
      return;
    }

    const validWorkspaceIds = new Set(resolvedMemberships.map((membership) => membership.workspaceId));
    const nextWorkspaceId =
      (storedWorkspaceId && validWorkspaceIds.has(storedWorkspaceId) && storedWorkspaceId)
      || resolvedMemberships[0].workspaceId;

    console.log(`${WORKSPACE_DEBUG_PREFIX} resolved currentWorkspaceId candidate`, {
      userId: user.id,
      storedWorkspaceId,
      currentWorkspaceId,
      nextWorkspaceId,
      validWorkspaceIds: Array.from(validWorkspaceIds),
    });

    if (nextWorkspaceId !== currentWorkspaceId) {
      console.log(`${WORKSPACE_DEBUG_PREFIX} updating currentWorkspaceId state`, {
        previous: currentWorkspaceId,
        next: nextWorkspaceId,
      });
      setCurrentWorkspaceIdState(nextWorkspaceId);
      setIsHydrated(false);
      writeStoredWorkspaceId(nextWorkspaceId);
      return;
    }

    writeStoredWorkspaceId(nextWorkspaceId);
    console.log(`${WORKSPACE_DEBUG_PREFIX} active workspace fully restored`, {
      userId: user.id,
      currentWorkspaceId: nextWorkspaceId,
    });
    setIsHydrated(true);
  }, [
    authLoading,
    currentWorkspaceId,
    isCreatingWorkspace,
    membershipsQuery.error,
    membershipsQuery.isError,
    membershipsQuery.isFetching,
    membershipsQuery.isLoading,
    membershipsQuery.isSuccess,
    resolvedMemberships,
    user,
  ]);

  useEffect(() => {
    if (!user || !membershipsQuery.isError) {
      return;
    }

    console.error(`${WORKSPACE_DEBUG_PREFIX} memberships query error, scheduling retry`, membershipsQuery.error);
    const retryTimer = window.setTimeout(() => {
      void membershipsQuery.refetch();
    }, 1500);

    return () => {
      window.clearTimeout(retryTimer);
    };
  }, [membershipsQuery, membershipsQuery.error, membershipsQuery.isError, membershipsQuery.refetch, user]);

  const setCurrentWorkspaceId = useCallback((workspaceId: string) => {
    if (!resolvedMemberships.some((membership) => membership.workspaceId === workspaceId)) {
      console.warn(`${WORKSPACE_DEBUG_PREFIX} ignored invalid workspace switch attempt`, {
        requestedWorkspaceId: workspaceId,
        validWorkspaceIds: resolvedMemberships.map((membership) => membership.workspaceId),
      });
      return;
    }

    console.log(`${WORKSPACE_DEBUG_PREFIX} switching workspace`, {
      previous: currentWorkspaceId,
      next: workspaceId,
    });
    setCurrentWorkspaceIdState(workspaceId);
    writeStoredWorkspaceId(workspaceId);
  }, [currentWorkspaceId, resolvedMemberships]);

  const refreshMemberships = useCallback(async () => {
    console.log(`${WORKSPACE_DEBUG_PREFIX} refreshing memberships`, { userId: user?.id ?? null });
    await queryClient.invalidateQueries({ queryKey: getWorkspaceMembershipsQueryKey(user?.id) });
    await membershipsQuery.refetch();
  }, [membershipsQuery, queryClient, user?.id]);

  const createWorkspace = useCallback(async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Workspace name is required.');
    }

    if (!user) {
      throw new Error('You must be signed in to create a workspace.');
    }

    setIsCreatingWorkspace(true);
    console.log(`${WORKSPACE_DEBUG_PREFIX} creating workspace`, {
      userId: user.id,
      workspaceName: trimmedName,
    });

    try {
      const { data, error } = await supabase.rpc('create_workspace_with_owner', {
        p_name: trimmedName,
      });

      if (error) {
        console.error(`${WORKSPACE_DEBUG_PREFIX} create workspace RPC failed`, error);
        throw error;
      }

      if (typeof data !== 'string' || !data) {
        throw new Error('Workspace creation failed. Please try again.');
      }

      console.log(`${WORKSPACE_DEBUG_PREFIX} create workspace RPC succeeded`, {
        userId: user.id,
        workspaceId: data,
      });

      const [
        { data: workspaceRow, error: workspaceVerifyError },
        { data: ownerMembershipRow, error: membershipVerifyError },
      ] = await Promise.all([
        supabase
          .from('workspaces')
          .select('id, name, created_at, created_by, updated_at')
          .eq('id', data)
          .maybeSingle(),
        supabase
          .from('workspace_members')
          .select('workspace_id, user_id, role, created_at')
          .eq('workspace_id', data)
          .eq('user_id', user.id)
          .eq('role', 'owner')
          .maybeSingle(),
      ]);

      console.log(`${WORKSPACE_DEBUG_PREFIX} workspace creation persistence check`, {
        workspaceId: data,
        workspaceRow,
        ownerMembershipRow,
      });

      if (workspaceVerifyError) {
        console.error(`${WORKSPACE_DEBUG_PREFIX} workspace persistence verification failed`, workspaceVerifyError);
        throw workspaceVerifyError;
      }

      if (membershipVerifyError) {
        console.error(`${WORKSPACE_DEBUG_PREFIX} workspace member persistence verification failed`, membershipVerifyError);
        throw membershipVerifyError;
      }

      if (!workspaceRow || !ownerMembershipRow) {
        throw new Error('Workspace creation did not persist required workspace/member rows.');
      }

      const verifiedMembership: WorkspaceMembership = {
        workspaceId: ownerMembershipRow.workspace_id,
        role: ownerMembershipRow.role,
        createdAt: ownerMembershipRow.created_at,
        workspace: workspaceRow,
      };

      queryClient.setQueryData<WorkspaceMembership[]>(
        getWorkspaceMembershipsQueryKey(user.id),
        (currentMemberships = []) => currentMemberships.some((membership) => membership.workspaceId === data)
          ? currentMemberships
          : [...currentMemberships, verifiedMembership],
      );

      setCurrentWorkspaceIdState(data);
      writeStoredWorkspaceId(data);

      await queryClient.invalidateQueries({ queryKey: getWorkspaceMembershipsQueryKey(user.id) });
      await membershipsQuery.refetch();

      return data;
    } catch (createError) {
      console.error(`${WORKSPACE_DEBUG_PREFIX} createWorkspace failed`, createError);
      throw createError;
    } finally {
      setIsCreatingWorkspace(false);
    }
  }, [membershipsQuery, queryClient, user]);

  const currentMembership = useMemo(
    () => resolvedMemberships.find((membership) => membership.workspaceId === currentWorkspaceId) ?? null,
    [currentWorkspaceId, resolvedMemberships],
  );

  const value = useMemo<WorkspaceContextType>(() => ({
    memberships: resolvedMemberships,
    currentWorkspaceId,
    currentWorkspace: currentMembership?.workspace ?? null,
    currentMembership,
    isLoading: authLoading || (!!user && (!membershipsReady || isCreatingWorkspace || (hasWorkspace && !currentWorkspaceId))),
    isHydrated,
    isResolved,
    hasWorkspace,
    setCurrentWorkspaceId,
    refreshMemberships,
    createWorkspace,
  }), [authLoading, createWorkspace, currentMembership, currentWorkspaceId, hasWorkspace, isCreatingWorkspace, isHydrated, isResolved, membershipsReady, refreshMemberships, resolvedMemberships, setCurrentWorkspaceId, user]);

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
