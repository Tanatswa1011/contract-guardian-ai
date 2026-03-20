
-- ISSUE 2: Replace permissive insert policy on workspace_members with owner-only
DROP POLICY IF EXISTS "wm_insert_member" ON public.workspace_members;

CREATE POLICY "wm_insert_owner_only"
ON public.workspace_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role = 'owner'
  )
);
