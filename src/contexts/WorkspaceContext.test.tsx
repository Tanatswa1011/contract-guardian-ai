import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceProvider, useWorkspace, type WorkspaceMembership } from '@/contexts/WorkspaceContext';

const CURRENT_WORKSPACE_STORAGE_KEY = 'contractguardai.currentWorkspaceId';

type MockAuthState = {
  user: { id: string } | null;
  loading: boolean;
};

let authState: MockAuthState = {
  user: null,
  loading: true,
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

const mockUseQuery = vi.mocked(useQuery);

function createMemberships(): WorkspaceMembership[] {
  return [
    {
      workspaceId: 'ws-alpha',
      role: 'owner',
      createdAt: '2026-03-19T00:00:00.000Z',
      workspace: {
        id: 'ws-alpha',
        name: 'Alpha',
        created_at: '2026-03-19T00:00:00.000Z',
        created_by: 'user-1',
        updated_at: '2026-03-19T00:00:00.000Z',
      },
    },
    {
      workspaceId: 'ws-beta',
      role: 'member',
      createdAt: '2026-03-19T00:00:01.000Z',
      workspace: {
        id: 'ws-beta',
        name: 'Beta',
        created_at: '2026-03-19T00:00:01.000Z',
        created_by: 'user-2',
        updated_at: '2026-03-19T00:00:01.000Z',
      },
    },
  ];
}

function createQueryResult(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isSuccess: false,
    isError: false,
    status: 'pending',
    fetchStatus: 'idle',
    error: null,
    refetch: vi.fn(),
    ...overrides,
  };
}

function WorkspaceSnapshot() {
  const workspace = useWorkspace();

  return (
    <div>
      <div data-testid="is-loading">{String(workspace.isLoading)}</div>
      <div data-testid="is-resolved">{String(workspace.isResolved)}</div>
      <div data-testid="has-workspace">{String(workspace.hasWorkspace)}</div>
      <div data-testid="current-workspace-id">{workspace.currentWorkspaceId ?? 'null'}</div>
      <div data-testid="membership-count">{String(workspace.memberships.length)}</div>
    </div>
  );
}

function renderWorkspaceProvider() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <WorkspaceProvider>
        <WorkspaceSnapshot />
      </WorkspaceProvider>
    </QueryClientProvider>,
  );
}

describe('WorkspaceProvider hydration', () => {
  beforeEach(() => {
    authState = {
      user: null,
      loading: true,
    };
    localStorage.clear();
    mockUseQuery.mockReset();
    mockUseQuery.mockReturnValue(createQueryResult());
  });

  afterEach(() => {
    cleanup();
  });

  it('does not clear the stored workspace while auth is still loading', async () => {
    localStorage.setItem(CURRENT_WORKSPACE_STORAGE_KEY, 'ws-beta');

    renderWorkspaceProvider();

    await waitFor(() => {
      expect(screen.getByTestId('is-resolved')).toHaveTextContent('false');
    });

    expect(localStorage.getItem(CURRENT_WORKSPACE_STORAGE_KEY)).toBe('ws-beta');
    expect(screen.getByTestId('current-workspace-id')).toHaveTextContent('null');
  });

  it('restores the stored workspace when the membership is still valid', async () => {
    authState = {
      user: { id: 'user-1' },
      loading: false,
    };
    localStorage.setItem(CURRENT_WORKSPACE_STORAGE_KEY, 'ws-beta');
    mockUseQuery.mockReturnValue(createQueryResult({
      data: createMemberships(),
      isSuccess: true,
      status: 'success',
    }));

    renderWorkspaceProvider();

    await waitFor(() => {
      expect(screen.getByTestId('is-resolved')).toHaveTextContent('true');
    });

    expect(screen.getByTestId('has-workspace')).toHaveTextContent('true');
    expect(screen.getByTestId('current-workspace-id')).toHaveTextContent('ws-beta');
    expect(localStorage.getItem(CURRENT_WORKSPACE_STORAGE_KEY)).toBe('ws-beta');
  });

  it('falls back to the first valid membership when the stored workspace is invalid', async () => {
    authState = {
      user: { id: 'user-1' },
      loading: false,
    };
    localStorage.setItem(CURRENT_WORKSPACE_STORAGE_KEY, 'ws-missing');
    mockUseQuery.mockReturnValue(createQueryResult({
      data: createMemberships(),
      isSuccess: true,
      status: 'success',
    }));

    renderWorkspaceProvider();

    await waitFor(() => {
      expect(screen.getByTestId('current-workspace-id')).toHaveTextContent('ws-alpha');
    });

    expect(screen.getByTestId('is-resolved')).toHaveTextContent('true');
    expect(localStorage.getItem(CURRENT_WORKSPACE_STORAGE_KEY)).toBe('ws-alpha');
  });

  it('does not clear stored workspace state when the memberships query errors', async () => {
    authState = {
      user: { id: 'user-1' },
      loading: false,
    };
    localStorage.setItem(CURRENT_WORKSPACE_STORAGE_KEY, 'ws-beta');
    mockUseQuery.mockReturnValue(createQueryResult({
      isError: true,
      status: 'error',
      error: new Error('workspace_members failed'),
    }));

    renderWorkspaceProvider();

    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
    });

    expect(screen.getByTestId('is-resolved')).toHaveTextContent('false');
    expect(localStorage.getItem(CURRENT_WORKSPACE_STORAGE_KEY)).toBe('ws-beta');
  });
});
