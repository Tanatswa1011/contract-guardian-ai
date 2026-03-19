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

const logWorkspace = (message: string, payload?: unknown) => {
  if (payload === undefined) {
    console.log(`${WORKSPACE_DEBUG_PREFIX} ${message}`);
    return;
  }

  console.log(`${WORKSPACE_DEBUG_PREFIX} ${message}`, payload);
};

const readStoredWorkspaceId = (reason: string) => {
  if (typeof window === 'undefined') {
    return null;
  }

  const storedWorkspaceId = window.localStorage.getItem(CURRENT_WORKSPACE_STORAGE_KEY);
  logWorkspace('localStorage read', {
    reason,
    key: CURRENT_WORKSPACE_STORAGE_KEY,
    storedWorkspaceId,
  });

  return storedWorkspaceId;
};

const writeStoredWorkspaceId = (workspaceId: string, reason: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  logWorkspace('localStorage write', {
    reason,
    key: CURRENT_WORKSPACE_STORAGE_KEY,
    workspaceId,
  });
  window.localStorage.setItem(CURRENT_WORKSPACE_STORAGE_KEY, workspaceId);
};

const clearStoredWorkspaceId = (reason: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  logWorkspace('localStorage remove', {
    reason,
    key: CURRENT_WORKSPACE_STORAGE_KEY,
  });
  window.localStorage.removeItem(CURRENT_WORKSPACE_STORAGE_KEY);
};

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [currentWorkspaceIdState, setCurrentWorkspaceIdState] = useState<string | null>(() => readStoredWorkspaceId('initial-state'));
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const membershipsQuery = useQuery({
    queryKey: getWorkspaceMembershipsQueryKey(user?.id),
    enabled: !authLoading && !!user,
    queryFn: async (): Promise<WorkspaceMembership[]> => {
      if (!user) {
        logWorkspace('memberships query skipped because there is no authenticated user');
        return [];
      }

      logWorkspace('memberships query start', { userId: user.id });

      await (supabase.rpc as any)('accept_my_pending_workspace_invites').catch((err: unknown) => {
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

      logWorkspace('raw workspace_members query result', {
        userId: user.id,
        count: membershipRows?.length ?? 0,
        memberships: membershipRows,
      });

      if (!membershipRows?.length) {
        logWorkspace('no workspace memberships found for user', { userId: user.id });
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

      logWorkspace('raw workspaces query result', {
        userId: user.id,
        count: workspaceRows?.length ?? 0,
        workspaces: workspaceRows,
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

      logWorkspace('resolved memberships count', {
        userId: user.id,
        count: nextMemberships.length,
        memberships: nextMemberships,
      });

      return nextMemberships;
    },
  });

  const memberships = membershipsQuery.data ?? [];
  const membershipsReady = !user || membershipsQuery.isSuccess;
  const membershipsPending = !!user && !membershipsQuery.isSuccess && !membershipsQuery.isError;

  const resolvedMemberships = useMemo(
    () => (membershipsReady && user ? memberships : []),
    [memberships, membershipsReady, user],
  );

  const validWorkspaceIds = useMemo(
    () => new Set(resolvedMemberships.map((membership) => membership.workspaceId)),
    [resolvedMemberships],
  );

  const currentWorkspaceId = useMemo(() => {
    if (!user || !membershipsReady) {
      return null;
    }

    if (currentWorkspaceIdState && validWorkspaceIds.has(currentWorkspaceIdState)) {
      return currentWorkspaceIdState;
    }

    return resolvedMemberships[0]?.workspaceId ?? null;
  }, [currentWorkspaceIdState, membershipsReady, resolvedMemberships, user, validWorkspaceIds]);

  const hasWorkspace = membershipsReady && resolvedMemberships.length > 0;
  const isResolved = !authLoading
    && !isCreatingWorkspace
    && (!user || (membershipsReady && (!hasWorkspace || !!currentWorkspaceId)));

  useEffect(() => {
    logWorkspace('auth hydration state', {
      authLoading,
      userId: user?.id ?? null,
      currentWorkspaceId,
      currentWorkspaceIdState,
      membershipsPending,
      membershipsReady,
      hasWorkspace,
      isResolved,
    });
  }, [authLoading, currentWorkspaceId, currentWorkspaceIdState, hasWorkspace, isResolved, membershipsPending, membershipsReady, user?.id]);

  useEffect(() => {
    if (authLoading) {
      logWorkspace('waiting for auth restoration before resolving workspace');
      setIsHydrated(false);
      return;
    }

    if (!user) {
      logWorkspace('clearing workspace state because there is no authenticated user', {
        previousCurrentWorkspaceId: currentWorkspaceIdState,
      });
      if (currentWorkspaceIdState !== null) {
        setCurrentWorkspaceIdState(null);
      }
      clearStoredWorkspaceId('auth-user-became-null');
      setIsHydrated(true);
      return;
    }

    if (isCreatingWorkspace) {
      logWorkspace('workspace creation in progress, keeping hydration pending', {
        userId: user.id,
        isCreatingWorkspace,
      });
      setIsHydrated(false);
      return;
    }

    if (membershipsPending) {
      logWorkspace('waiting for workspace membership query to finish', {
        userId: user.id,
        queryStatus: membershipsQuery.status,
        fetchStatus: membershipsQuery.fetchStatus,
      });
      setIsHydrated(false);
      return;
    }

    if (membershipsQuery.isError) {
      console.error(`${WORKSPACE_DEBUG_PREFIX} keeping workspace unresolved because memberships query failed`, membershipsQuery.error);
      setIsHydrated(false);
      return;
    }

    const storedWorkspaceId = readStoredWorkspaceId('hydration-resolution');
    logWorkspace('workspace resolution inputs', {
      userId: user.id,
      storedWorkspaceId,
      currentWorkspaceIdState,
      resolvedMembershipCount: resolvedMemberships.length,
      validWorkspaceIds: Array.from(validWorkspaceIds),
    });

    if (resolvedMemberships.length === 0) {
      logWorkspace('no workspace memberships found after successful resolution', {
        userId: user.id,
      });
      if (currentWorkspaceIdState !== null) {
        setCurrentWorkspaceIdState(null);
      }
      clearStoredWorkspaceId('no-memberships-after-successful-query');
      setIsHydrated(true);
      return;
    }

    logWorkspace('final resolved currentWorkspaceId', {
      userId: user.id,
      storedWorkspaceId,
      currentWorkspaceIdState,
      resolvedCurrentWorkspaceId: currentWorkspaceId,
    });

    if (!currentWorkspaceId) {
      logWorkspace('workspace selection still pending despite resolved memberships', {
        userId: user.id,
      });
      setIsHydrated(false);
      return;
    }

    if (currentWorkspaceId !== currentWorkspaceIdState) {
      logWorkspace('syncing currentWorkspaceId state from resolved workspace selection', {
        previousCurrentWorkspaceId: currentWorkspaceIdState,
        nextCurrentWorkspaceId: currentWorkspaceId,
      });
      setCurrentWorkspaceIdState(currentWorkspaceId);
    }

    if (storedWorkspaceId !== currentWorkspaceId) {
      writeStoredWorkspaceId(currentWorkspaceId, 'hydration-sync');
    }

    setIsHydrated(true);
  }, [authLoading, currentWorkspaceId, currentWorkspaceIdState, isCreatingWorkspace, membershipsPending, membershipsQuery.error, membershipsQuery.fetchStatus, membershipsQuery.isError, membershipsQuery.status, resolvedMemberships, user, validWorkspaceIds]);

  const setCurrentWorkspaceId = useCallback((workspaceId: string) => {
    if (!resolvedMemberships.some((membership) => membership.workspaceId === workspaceId)) {
      console.warn(`${WORKSPACE_DEBUG_PREFIX} ignored invalid workspace switch attempt`, {
        requestedWorkspaceId: workspaceId,
        validWorkspaceIds: resolvedMemberships.map((membership) => membership.workspaceId),
      });
      return;
    }

    logWorkspace('switching current workspace', {
      previous: currentWorkspaceId,
      next: workspaceId,
    });
    setCurrentWorkspaceIdState(workspaceId);
    writeStoredWorkspaceId(workspaceId, 'manual-workspace-switch');
  }, [currentWorkspaceId, resolvedMemberships]);

  const refreshMemberships = useCallback(async () => {
    logWorkspace('refreshing workspace memberships', { userId: user?.id ?? null });
    if (!user) {
      return;
    }
    await queryClient.invalidateQueries({ queryKey: getWorkspaceMembershipsQueryKey(user?.id) });
    await membershipsQuery.refetch();
  }, [membershipsQuery, queryClient, user]);

  const createWorkspace = useCallback(async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Workspace name is required.');
    }

    if (!user) {
      throw new Error('You must be signed in to create a workspace.');
    }

    setIsCreatingWorkspace(true);
    logWorkspace('creating workspace', {
      userId: user.id,
      workspaceName: trimmedName,
    });

    try {
      const { data, error } = await (supabase.rpc as any)('create_workspace_with_owner', {
        p_name: trimmedName,
      });

      if (error) {
        console.error(`${WORKSPACE_DEBUG_PREFIX} create_workspace_with_owner RPC failed`, error);
        throw error;
      }

      if (typeof data !== 'string' || !data) {
        throw new Error('Workspace creation failed. Please try again.');
      }

      logWorkspace('create_workspace_with_owner RPC succeeded', {
        userId: user.id,
        workspaceId: data,
      });

      let verifiedMembership: WorkspaceMembership | null = null;

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const [
          { data: workspaceRow, error: workspaceError },
          { data: membershipRow, error: membershipError },
        ] = await Promise.all([
          supabase
            .from('workspaces')
            .select('*')
            .eq('id', data)
            .maybeSingle(),
          supabase
            .from('workspace_members')
            .select('workspace_id, role, created_at')
            .eq('workspace_id', data)
            .eq('user_id', user.id)
            .maybeSingle(),
        ]);

        logWorkspace('workspace creation verification attempt', {
          attempt,
          workspaceId: data,
          workspaceRow,
          membershipRow,
          workspaceError,
          membershipError,
        });

        if (workspaceError) {
          throw workspaceError;
        }

        if (membershipError) {
          throw membershipError;
        }

        if (workspaceRow && membershipRow?.role === 'owner') {
          verifiedMembership = {
            workspaceId: membershipRow.workspace_id,
            role: membershipRow.role,
            createdAt: membershipRow.created_at,
            workspace: workspaceRow,
          };
          break;
        }

        if (attempt < 3) {
          await new Promise((resolve) => window.setTimeout(resolve, attempt * 150));
        }
      }

      if (!verifiedMembership) {
        throw new Error('Workspace creation did not produce readable workspace and owner membership rows.');
      }

      queryClient.setQueryData<WorkspaceMembership[]>(
        getWorkspaceMembershipsQueryKey(user.id),
        (currentMemberships = []) => currentMemberships.some((membership) => membership.workspaceId === data)
          ? currentMemberships
          : [...currentMemberships, verifiedMembership as WorkspaceMembership],
      );

      setCurrentWorkspaceIdState(data);
      writeStoredWorkspaceId(data, 'create-workspace-success');

      await queryClient.invalidateQueries({ queryKey: getWorkspaceMembershipsQueryKey(user.id) });
      await membershipsQuery.refetch();

      return data;
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
    isLoading: authLoading || isCreatingWorkspace || (!!user && (!membershipsReady || (hasWorkspace && !currentWorkspaceId))),
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
