
-- Create the missing create_workspace_with_owner RPC
CREATE OR REPLACE FUNCTION public.create_workspace_with_owner(p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_workspace_id uuid;
BEGIN
  INSERT INTO public.workspaces (id, name, created_by)
  VALUES (gen_random_uuid(), p_name, auth.uid())
  RETURNING id INTO new_workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, auth.uid(), 'owner');

  RETURN new_workspace_id;
END;
$$;

-- Create the missing accept_my_pending_workspace_invites RPC
CREATE OR REPLACE FUNCTION public.accept_my_pending_workspace_invites()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inv RECORD;
  caller_email text;
BEGIN
  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();
  
  IF caller_email IS NULL THEN
    RETURN;
  END IF;

  FOR inv IN
    SELECT id, workspace_id, role
    FROM public.workspace_invites
    WHERE email = caller_email
      AND status = 'pending'
  LOOP
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (inv.workspace_id, auth.uid(), inv.role)
    ON CONFLICT DO NOTHING;

    UPDATE public.workspace_invites
    SET status = 'accepted', accepted_at = now()
    WHERE id = inv.id;
  END LOOP;
END;
$$;
