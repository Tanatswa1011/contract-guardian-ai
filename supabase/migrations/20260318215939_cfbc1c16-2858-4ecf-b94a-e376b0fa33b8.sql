
-- 1. Allow workspace members to read profiles of other members in their workspaces
-- (needed for WorkspaceSettings to show member names)
CREATE POLICY "profiles_select_workspace_coworkers"
ON public.profiles
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.workspace_members wm1
    JOIN public.workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
    WHERE wm1.user_id = auth.uid() AND wm2.user_id = profiles.user_id
  )
);

-- 2. Allow owners to delete workspace members (not themselves, not other owners)
CREATE POLICY "owners_can_remove_members"
ON public.workspace_members
FOR DELETE TO authenticated
USING (
  -- The member being deleted is NOT the current user
  user_id <> auth.uid()
  -- The member being deleted is NOT an owner
  AND role <> 'owner'
  -- The current user IS an owner of this workspace
  AND EXISTS (
    SELECT 1 FROM public.workspace_members owner_check
    WHERE owner_check.workspace_id = workspace_members.workspace_id
    AND owner_check.user_id = auth.uid()
    AND owner_check.role = 'owner'
  )
);

-- 3. Allow owners to delete their workspaces
CREATE POLICY "owners_can_delete_workspaces"
ON public.workspaces
FOR DELETE TO authenticated
USING (created_by = auth.uid());

-- 4. Add ON DELETE CASCADE to workspace-related foreign keys for clean workspace deletion
-- First for contracts -> workspaces
ALTER TABLE public.contracts
  DROP CONSTRAINT IF EXISTS contracts_workspace_id_fkey;
ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- workspace_members -> workspaces (already has cascade from schema, but ensure it)
ALTER TABLE public.workspace_members
  DROP CONSTRAINT IF EXISTS workspace_members_workspace_id_fkey;
ALTER TABLE public.workspace_members
  ADD CONSTRAINT workspace_members_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- workspace_invites -> workspaces
ALTER TABLE public.workspace_invites
  DROP CONSTRAINT IF EXISTS workspace_invites_workspace_id_fkey;
ALTER TABLE public.workspace_invites
  ADD CONSTRAINT workspace_invites_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- contract_dates -> contracts (ensure cascade so deleting contracts cleans dates)
ALTER TABLE public.contract_dates
  DROP CONSTRAINT IF EXISTS contract_dates_contract_id_fkey;
ALTER TABLE public.contract_dates
  ADD CONSTRAINT contract_dates_contract_id_fkey
  FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;

-- contract_files -> contracts
ALTER TABLE public.contract_files
  DROP CONSTRAINT IF EXISTS contract_files_contract_id_fkey;
ALTER TABLE public.contract_files
  ADD CONSTRAINT contract_files_contract_id_fkey
  FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;

-- extraction_runs -> contracts
ALTER TABLE public.extraction_runs
  DROP CONSTRAINT IF EXISTS extraction_runs_contract_id_fkey;
ALTER TABLE public.extraction_runs
  ADD CONSTRAINT extraction_runs_contract_id_fkey
  FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;

-- reminder_rules -> contracts
ALTER TABLE public.reminder_rules
  DROP CONSTRAINT IF EXISTS reminder_rules_contract_id_fkey;
ALTER TABLE public.reminder_rules
  ADD CONSTRAINT reminder_rules_contract_id_fkey
  FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;

-- reminder_rules -> contract_dates
ALTER TABLE public.reminder_rules
  DROP CONSTRAINT IF EXISTS reminder_rules_contract_date_id_fkey;
ALTER TABLE public.reminder_rules
  ADD CONSTRAINT reminder_rules_contract_date_id_fkey
  FOREIGN KEY (contract_date_id) REFERENCES public.contract_dates(id) ON DELETE CASCADE;

-- notification_log -> contracts
ALTER TABLE public.notification_log
  DROP CONSTRAINT IF EXISTS notification_log_contract_id_fkey;
ALTER TABLE public.notification_log
  ADD CONSTRAINT notification_log_contract_id_fkey
  FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;

-- notification_log -> contract_dates
ALTER TABLE public.notification_log
  DROP CONSTRAINT IF EXISTS notification_log_contract_date_id_fkey;
ALTER TABLE public.notification_log
  ADD CONSTRAINT notification_log_contract_date_id_fkey
  FOREIGN KEY (contract_date_id) REFERENCES public.contract_dates(id) ON DELETE CASCADE;

-- notification_queue -> contracts
ALTER TABLE public.notification_queue
  DROP CONSTRAINT IF EXISTS notification_queue_contract_id_fkey;
ALTER TABLE public.notification_queue
  ADD CONSTRAINT notification_queue_contract_id_fkey
  FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;

-- notification_queue -> contract_dates
ALTER TABLE public.notification_queue
  DROP CONSTRAINT IF EXISTS notification_queue_contract_date_id_fkey;
ALTER TABLE public.notification_queue
  ADD CONSTRAINT notification_queue_contract_date_id_fkey
  FOREIGN KEY (contract_date_id) REFERENCES public.contract_dates(id) ON DELETE CASCADE;

-- notification_queue -> reminder_rules
ALTER TABLE public.notification_queue
  DROP CONSTRAINT IF EXISTS notification_queue_reminder_rule_id_fkey;
ALTER TABLE public.notification_queue
  ADD CONSTRAINT notification_queue_reminder_rule_id_fkey
  FOREIGN KEY (reminder_rule_id) REFERENCES public.reminder_rules(id) ON DELETE CASCADE;

-- Drop the existing profiles_select_own policy to avoid conflict with the new broader one
-- Actually keep it - both are permissive so they OR together, which is fine.
