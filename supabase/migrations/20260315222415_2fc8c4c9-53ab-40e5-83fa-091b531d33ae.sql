
-- 1. Create workspaces table
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- 2. Create workspace_members table
CREATE TABLE public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- 3. Add workspace_id to contracts
ALTER TABLE public.contracts ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- 4. Security definer function to check workspace membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = auth.uid()
  );
$$;

-- 5. RLS policies for workspaces
CREATE POLICY "workspace_select_member" ON public.workspaces
  FOR SELECT TO authenticated
  USING (is_workspace_member(id));

CREATE POLICY "workspace_insert_own" ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "workspace_update_member" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (is_workspace_member(id));

-- 6. RLS policies for workspace_members
CREATE POLICY "wm_select_member" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "wm_insert_member" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "wm_delete_own" ON public.workspace_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 7. Trigger to auto-create profile + default workspace on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_workspace_id uuid;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, display_name, notification_email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Create default workspace
  INSERT INTO public.workspaces (id, name, created_by)
  VALUES (gen_random_uuid(), 'My Workspace', NEW.id)
  RETURNING id INTO new_workspace_id;

  -- Add user as owner of workspace
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Create storage bucket for contract documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('contract-documents', 'contract-documents', false, 20971520, ARRAY['application/pdf']);

-- 9. Storage RLS policies
CREATE POLICY "Users can upload contract docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contract-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own contract docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'contract-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own contract docs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'contract-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 10. Updated_at trigger for workspaces
CREATE TRIGGER set_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
