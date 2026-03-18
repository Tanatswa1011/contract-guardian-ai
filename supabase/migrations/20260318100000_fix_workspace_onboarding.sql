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


CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, notification_email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
