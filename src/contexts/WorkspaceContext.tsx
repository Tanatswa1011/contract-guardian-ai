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
  isHydrated: boolean;
  isResolved: boolean;
  hasWorkspace: boolean;
  setCurrentWorkspaceId: (workspaceId: string) => void;
  refreshMemberships: () => Promise<void>;
  createWorkspace: (name: string) => Promise<string>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const readStoredWorkspaceId = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(CURRENT_WORKSPACE_STORAGE_KEY);
};

const writeStoredWorkspaceId = (workspaceId: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CURRENT_WORKSPACE_STORAGE_KEY, workspaceId);
};

const clearStoredWorkspaceId = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(CURRENT_WORKSPACE_STORAGE_KEY);
};

const resolveWorkspaceId = (
  memberships: WorkspaceMembership[],
  preferredWorkspaceId: string | null,
) => {
  if (!memberships.length) return null;

  const validWorkspaceIds = new Set(memberships.map((m) => m.workspaceId));
  if (preferredWorkspaceId && validWorkspaceIds.has(preferredWorkspaceId)) {
    return preferredWorkspaceId;
  }
  return memberships[0].workspaceId;
};

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [storedWorkspaceId, setStoredWorkspaceId] = useState<string | null>(() => readStoredWorkspaceId());
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);

  const membershipsQuery = useQuery({
    queryKey: getWorkspaceMembershipsQueryKey(user?.id),
    enabled: !authLoading && !!user,
    retry: 2,
    queryFn: async (): Promise<WorkspaceMembership[]> => {
      if (!user) return [];

      const { error: acceptInvitesError } = await supabase.rpc('accept_my_pending_workspace_invites');
      if (acceptInvitesError) {
        console.error('Failed to accept pending workspace invites', acceptInvitesError);
      }

      const { data: membershipRows, error: membershipError } = await supabase
        .from('workspace_members')
        .select('workspace_id, role, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (membershipError) throw membershipError;
      if (!membershipRows?.length) return [];

      const workspaceIds = membershipRows.map((m) => m.workspace_id);
      const { data: workspaceRows, error: workspaceError } = await supabase
        .from('workspaces')
        .select('*')
        .in('id', workspaceIds);

      if (workspaceError) throw workspaceError;

      const workspacesById = new Map(
        (workspaceRows ?? []).map((w) => [w.id, w] as const),
      );

      return membershipRows.flatMap((membership) => {
        const workspace = workspacesById.get(membership.workspace_id);
        if (!workspace) return [];
        return [{
          workspaceId: membership.workspace_id,
          role: membership.role,
          createdAt: membership.created_at,
          workspace,
        }];
      });
    },
  });

  const memberships = useMemo(
    () => (user ? (membershipsQuery.data ?? []) : []),
    [membershipsQuery.data, user],
  );

  const membershipsLoaded = !user || membershipsQuery.isSuccess;
  const hasWorkspace = memberships.length > 0;
  const currentWorkspaceId = useMemo(
    () => (user && membershipsLoaded ? resolveWorkspaceId(memberships, storedWorkspaceId) : null),
    [memberships, membershipsLoaded, storedWorkspaceId, user],
  );

  const currentMembership = useMemo(
    () => memberships.find((m) => m.workspaceId === currentWorkspaceId) ?? null,
    [currentWorkspaceId, memberships],
  );

  const isResolved = !authLoading
    && !isCreatingWorkspace
    && membershipsLoaded
    && (!hasWorkspace || !!currentWorkspaceId);

  const isLoading = authLoading
    || (!!user && (!membershipsLoaded || isCreatingWorkspace || (hasWorkspace && !currentWorkspaceId)));

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      if (storedWorkspaceId !== null) {
        setStoredWorkspaceId(null);
        clearStoredWorkspaceId();
      }
      return;
    }

    if (!membershipsLoaded) return;

    if (!hasWorkspace) {
      if (storedWorkspaceId !== null) {
        setStoredWorkspaceId(null);
        clearStoredWorkspaceId();
      }
      return;
    }

    if (!currentWorkspaceId) return;

    if (storedWorkspaceId !== currentWorkspaceId) {
      setStoredWorkspaceId(currentWorkspaceId);
    }

    writeStoredWorkspaceId(currentWorkspaceId);
  }, [authLoading, currentWorkspaceId, hasWorkspace, memberships, membershipsLoaded, storedWorkspaceId, user]);

  useEffect(() => {
    if (!user || !membershipsQuery.isError) return;

    const retryTimer = window.setTimeout(() => {
      void membershipsQuery.refetch();
    }, 1500);

    return () => { window.clearTimeout(retryTimer); };
  }, [membershipsQuery, membershipsQuery.error, membershipsQuery.isError, membershipsQuery.refetch, user]);

  const setCurrentWorkspaceId = useCallback((workspaceId: string) => {
    if (!memberships.some((m) => m.workspaceId === workspaceId)) return;
    setStoredWorkspaceId(workspaceId);
    writeStoredWorkspaceId(workspaceId);
  }, [memberships]);

  const refreshMemberships = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: getWorkspaceMembershipsQueryKey(user?.id) });
    await membershipsQuery.refetch();
  }, [membershipsQuery, queryClient, user?.id]);

  const createWorkspace = useCallback(async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error('Workspace name is required.');
    if (!user) throw new Error('You must be signed in to create a workspace.');

    setIsCreatingWorkspace(true);

    try {
      const { data, error } = await supabase.rpc('create_workspace_with_owner', { p_name: trimmedName });
      if (error) throw error;
      if (typeof data !== 'string' || !data) throw new Error('Workspace creation failed. Please try again.');

      const [
        { data: workspaceRow, error: workspaceVerifyError },
        { data: ownerMembershipRow, error: membershipVerifyError },
      ] = await Promise.all([
        supabase.from('workspaces').select('id, name, created_at, created_by, updated_at').eq('id', data).maybeSingle(),
        supabase.from('workspace_members').select('workspace_id, user_id, role, created_at').eq('workspace_id', data).eq('user_id', user.id).eq('role', 'owner').maybeSingle(),
      ]);

      if (workspaceVerifyError) throw workspaceVerifyError;
      if (membershipVerifyError) throw membershipVerifyError;
      if (!workspaceRow || !ownerMembershipRow) throw new Error('Workspace creation did not persist required workspace/member rows.');

      const verifiedMembership: WorkspaceMembership = {
        workspaceId: ownerMembershipRow.workspace_id,
        role: ownerMembershipRow.role,
        createdAt: ownerMembershipRow.created_at,
        workspace: workspaceRow,
      };

      queryClient.setQueryData<WorkspaceMembership[]>(
        getWorkspaceMembershipsQueryKey(user.id),
        (current = []) => current.some((m) => m.workspaceId === data) ? current : [...current, verifiedMembership],
      );

      setStoredWorkspaceId(data);
      writeStoredWorkspaceId(data);

      await queryClient.invalidateQueries({ queryKey: getWorkspaceMembershipsQueryKey(user.id) });
      await membershipsQuery.refetch();

      return data;
    } catch (err) {
      throw err;
    } finally {
      setIsCreatingWorkspace(false);
    }
  }, [membershipsQuery, queryClient, user]);

  const value = useMemo<WorkspaceContextType>(() => ({
    memberships,
    currentWorkspaceId,
    currentWorkspace: currentMembership?.workspace ?? null,
    currentMembership,
    isLoading,
    isHydrated: isResolved,
    isResolved,
    hasWorkspace,
    setCurrentWorkspaceId,
    refreshMemberships,
    createWorkspace,
  }), [createWorkspace, currentMembership, currentWorkspaceId, hasWorkspace, isLoading, isResolved, memberships, refreshMemberships, setCurrentWorkspaceId]);

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
