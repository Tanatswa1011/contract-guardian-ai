CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_workspace_id uuid;
  ws_name text;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, display_name, notification_email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Use workspace name from signup metadata, fallback to 'My Workspace'
  ws_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'workspace_name'), ''), 'My Workspace');

  -- Create default workspace
  INSERT INTO public.workspaces (id, name, created_by)
  VALUES (gen_random_uuid(), ws_name, NEW.id)
  RETURNING id INTO new_workspace_id;

  -- Add user as owner of workspace
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, NEW.id, 'owner');

  RETURN NEW;
END;
$function$;