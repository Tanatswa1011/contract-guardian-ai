DROP POLICY IF EXISTS "wm_insert_owner_for_created_workspace" ON public.workspace_members;

CREATE POLICY "wm_insert_owner_for_created_workspace"
  ON public.workspace_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'owner'
    AND EXISTS (
      SELECT 1
      FROM public.workspaces
      WHERE workspaces.id = workspace_members.workspace_id
        AND workspaces.created_by = auth.uid()
    )
  );
