
CREATE TABLE public.workspace_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE (workspace_id, email)
);

ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

-- Members of the workspace can view invites
CREATE POLICY "workspace_invites_select_member"
  ON public.workspace_invites FOR SELECT TO authenticated
  USING (is_workspace_member(workspace_id));

-- Only workspace members can create invites
CREATE POLICY "workspace_invites_insert_member"
  ON public.workspace_invites FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(workspace_id) AND invited_by = auth.uid());

-- Only workspace members can update invites (for accepting)
CREATE POLICY "workspace_invites_update_member"
  ON public.workspace_invites FOR UPDATE TO authenticated
  USING (is_workspace_member(workspace_id) OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Only workspace members can delete invites
CREATE POLICY "workspace_invites_delete_member"
  ON public.workspace_invites FOR DELETE TO authenticated
  USING (is_workspace_member(workspace_id));
