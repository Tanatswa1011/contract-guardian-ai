-- Fix overly permissive INSERT policy on enterprise_inquiries
-- Replace "WITH CHECK (true)" with email ownership check
DROP POLICY IF EXISTS "enterprise_inquiries_insert_authenticated" ON public.enterprise_inquiries;
CREATE POLICY "enterprise_inquiries_insert_authenticated" ON public.enterprise_inquiries
  FOR INSERT TO authenticated
  WITH CHECK (
    email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())::text
  );

-- Fix overly permissive INSERT policy on pro_waitlist
DROP POLICY IF EXISTS "waitlist_insert_authenticated" ON public.pro_waitlist;
CREATE POLICY "waitlist_insert_authenticated" ON public.pro_waitlist
  FOR INSERT TO authenticated
  WITH CHECK (
    email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())::text
  );

-- Set search_path on functions that are missing it
CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = public
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_recalc_status_from_dates()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
BEGIN
  PERFORM public.recalc_contract_status(COALESCE(NEW.contract_id, OLD.contract_id));
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_recalc_status_from_contract()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
BEGIN
  IF NEW.end_date IS DISTINCT FROM OLD.end_date THEN
    PERFORM public.recalc_contract_status(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_contract_user_id()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $function$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$function$;