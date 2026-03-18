-- Allow workspace creator to add themselves as owner when creating a new workspace.
-- The wm_insert_member policy requires is_workspace_member(workspace_id), but the
-- creator is not yet a member when inserting the first workspace_members row.
CREATE POLICY "wm_insert_as_creator" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE id = workspace_id AND created_by = auth.uid()
    )
  );
