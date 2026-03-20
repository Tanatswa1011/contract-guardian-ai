import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export type PlanTier = 'free' | 'pro' | 'enterprise';

const PLAN_LIMITS: Record<PlanTier, {
  maxContracts: number;
  maxUploads: number;
  maxMembers: number;
  maxNotificationEmails: number;
  slackEnabled: boolean;
}> = {
  free: { maxContracts: 5, maxUploads: 5, maxMembers: 1, maxNotificationEmails: 1, slackEnabled: false },
  pro: { maxContracts: Infinity, maxUploads: Infinity, maxMembers: 5, maxNotificationEmails: 2, slackEnabled: true },
  enterprise: { maxContracts: Infinity, maxUploads: Infinity, maxMembers: Infinity, maxNotificationEmails: Infinity, slackEnabled: true },
};

export function usePlanLimits() {
  const { user } = useAuth();
  const { currentWorkspaceId, isResolved } = useWorkspace();

  const { data: plan = 'free' as PlanTier } = useQuery({
    queryKey: ['user-plan', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('plan')
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      const tier = (data?.plan as PlanTier) || 'free';
      return PLAN_LIMITS[tier] ? tier : 'free' as PlanTier;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: contractCount = 0 } = useQuery({
    queryKey: ['contract-count', user?.id, currentWorkspaceId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('contracts')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', currentWorkspaceId!);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user && isResolved && !!currentWorkspaceId,
    staleTime: 30_000,
  });

  const { data: memberCount = 0 } = useQuery({
    queryKey: ['member-count', currentWorkspaceId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('workspace_members')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', currentWorkspaceId!);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user && isResolved && !!currentWorkspaceId,
    staleTime: 30_000,
  });

  const { data: pendingInviteCount = 0 } = useQuery({
    queryKey: ['pending-invite-count', currentWorkspaceId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('workspace_invites')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', currentWorkspaceId!)
        .eq('status', 'pending');
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user && isResolved && !!currentWorkspaceId,
    staleTime: 30_000,
  });

  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
  const canUpload = contractCount < limits.maxContracts;
  const contractsRemaining = Math.max(0, limits.maxContracts - contractCount);
  const isPaid = plan !== 'free';

  const totalMemberSlots = memberCount + pendingInviteCount;
  const canAddMember = totalMemberSlots < limits.maxMembers;
  const membersRemaining = Math.max(0, limits.maxMembers - totalMemberSlots);

  // Notification emails: currently 1 per user profile; future-proof for multiple
  const notificationEmailCount = 1; // profiles.notification_email is always 1
  const canAddNotificationEmail = notificationEmailCount < limits.maxNotificationEmails;
  const emailsRemaining = Math.max(0, limits.maxNotificationEmails - notificationEmailCount);

  return {
    plan,
    limits,
    contractCount,
    canUpload,
    contractsRemaining,
    isPaid,
    isSlackEnabled: limits.slackEnabled,
    memberCount,
    pendingInviteCount,
    totalMemberSlots,
    canAddMember,
    membersRemaining,
    notificationEmailCount,
    canAddNotificationEmail,
    emailsRemaining,
  };
}
