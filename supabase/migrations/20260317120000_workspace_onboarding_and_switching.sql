
CREATE OR REPLACE FUNCTION public.create_workspace_with_owner(p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trimmed_name text;
  new_workspace_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  trimmed_name := btrim(p_name);
  IF trimmed_name = '' THEN
    RAISE EXCEPTION 'Workspace name is required';
  END IF;

  INSERT INTO public.workspaces (name, created_by)
  VALUES (trimmed_name, auth.uid())
  RETURNING id INTO new_workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, auth.uid(), 'owner')
  ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET role = EXCLUDED.role;

  RETURN new_workspace_id;
END;
$$;


CREATE OR REPLACE FUNCTION public.accept_my_pending_workspace_invites()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_email text;
  accepted_count integer := 0;
  pending_invite RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;

  SELECT email
  INTO current_user_email
  FROM auth.users
  WHERE id = auth.uid();

  IF current_user_email IS NULL THEN
    RETURN 0;
  END IF;

  FOR pending_invite IN
    SELECT id, workspace_id, role
    FROM public.workspace_invites
    WHERE lower(email) = lower(current_user_email)
      AND status = 'pending'
  LOOP
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (pending_invite.workspace_id, auth.uid(), pending_invite.role)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;

    UPDATE public.workspace_invites
    SET status = 'accepted', accepted_at = COALESCE(accepted_at, now())
    WHERE id = pending_invite.id
      AND status = 'pending';

    accepted_count := accepted_count + 1;
  END LOOP;

  RETURN accepted_count;
END;
$$;


CREATE OR REPLACE FUNCTION public.can_access_contract_document(object_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  contract_uuid uuid;
BEGIN
  IF auth.uid() IS NULL OR object_name IS NULL THEN
    RETURN false;
  END IF;

  BEGIN
    contract_uuid := NULLIF(split_part(object_name, '/', 2), '')::uuid;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN false;
  END;

  RETURN EXISTS (
    SELECT 1
    FROM public.contracts AS contracts
    JOIN public.contract_files AS contract_files
      ON contract_files.contract_id = contracts.id
    WHERE contracts.id = contract_uuid
      AND contract_files.storage_path = object_name
      AND (
        contracts.user_id = auth.uid()
        OR (
          contracts.workspace_id IS NOT NULL
          AND public.is_workspace_member(contracts.workspace_id)
        )
      )
  );
END;
$$;


DROP POLICY IF EXISTS "Users can view own contract docs" ON storage.objects;

CREATE POLICY "Users can view accessible contract docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'contract-documents'
    AND public.can_access_contract_document(name)
  );
