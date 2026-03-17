-- Allow workspace creator to add themselves as owner when creating a new workspace
CREATE POLICY "wm_insert_creator" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.created_by = auth.uid()
    )
  );
