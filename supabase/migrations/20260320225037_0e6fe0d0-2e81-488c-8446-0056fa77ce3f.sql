-- Fix 1: Restrict workspace updates to owners only
DROP POLICY IF EXISTS "workspace_update_member" ON public.workspaces;
CREATE POLICY "workspace_update_owner" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = workspaces.id
        AND user_id = auth.uid()
        AND role = 'owner'
    )
  );

-- Fix 2: Add plan limit enforcement triggers

CREATE OR REPLACE FUNCTION public.check_contract_plan_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan text;
  contract_count int;
  max_contracts int;
BEGIN
  SELECT plan INTO user_plan FROM public.profiles WHERE user_id = NEW.user_id;
  user_plan := COALESCE(user_plan, 'free');

  IF user_plan = 'free' THEN
    max_contracts := 5;
  ELSE
    RETURN NEW;
  END IF;

  SELECT count(*) INTO contract_count
  FROM public.contracts
  WHERE user_id = NEW.user_id;

  IF contract_count >= max_contracts THEN
    RAISE EXCEPTION 'Plan limit reached: free plan allows % contracts', max_contracts;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_contract_plan_limit
  BEFORE INSERT ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.check_contract_plan_limit();

CREATE OR REPLACE FUNCTION public.check_member_plan_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id uuid;
  owner_plan text;
  member_count int;
  invite_count int;
  max_members int;
BEGIN
  SELECT user_id INTO owner_id
  FROM public.workspace_members
  WHERE workspace_id = NEW.workspace_id AND role = 'owner'
  LIMIT 1;

  IF owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT plan INTO owner_plan FROM public.profiles WHERE user_id = owner_id;
  owner_plan := COALESCE(owner_plan, 'free');

  IF owner_plan = 'free' THEN
    max_members := 1;
  ELSIF owner_plan = 'pro' THEN
    max_members := 5;
  ELSE
    RETURN NEW;
  END IF;

  SELECT count(*) INTO member_count
  FROM public.workspace_members
  WHERE workspace_id = NEW.workspace_id;

  SELECT count(*) INTO invite_count
  FROM public.workspace_invites
  WHERE workspace_id = NEW.workspace_id AND status = 'pending';

  IF (member_count + invite_count) >= max_members THEN
    RAISE EXCEPTION 'Plan limit reached: % plan allows % members', owner_plan, max_members;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_member_plan_limit
  BEFORE INSERT ON public.workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION public.check_member_plan_limit();