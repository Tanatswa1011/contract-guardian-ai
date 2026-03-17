DROP POLICY IF EXISTS "wm_insert_member" ON public.workspace_members;

CREATE POLICY "wm_insert_member" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (
    is_workspace_member(workspace_id)
    OR (
      user_id = auth.uid()
      AND role = 'owner'
      AND EXISTS (
        SELECT 1
        FROM public.workspaces
        WHERE workspaces.id = workspace_members.workspace_id
          AND workspaces.created_by = auth.uid()
      )
    )
  );
