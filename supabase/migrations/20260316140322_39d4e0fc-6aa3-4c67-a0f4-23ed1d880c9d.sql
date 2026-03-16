
CREATE OR REPLACE FUNCTION public.accept_pending_invites()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inv RECORD;
BEGIN
  FOR inv IN
    SELECT id, workspace_id, role
    FROM public.workspace_invites
    WHERE email = NEW.email
      AND status = 'pending'
  LOOP
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (inv.workspace_id, NEW.id, inv.role)
    ON CONFLICT DO NOTHING;

    UPDATE public.workspace_invites
    SET status = 'accepted', accepted_at = now()
    WHERE id = inv.id;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_created_accept_invites
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.accept_pending_invites();
