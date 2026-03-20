-- Fix remaining functions missing search_path

CREATE OR REPLACE FUNCTION public.enforce_queue_contract_consistency()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
DECLARE
  cd_contract uuid;
BEGIN
  IF NEW.contract_date_id IS NOT NULL THEN
    SELECT contract_id INTO cd_contract
    FROM public.contract_dates
    WHERE id = NEW.contract_date_id;

    IF cd_contract IS NULL THEN
      RAISE EXCEPTION 'contract_date_id % not found', NEW.contract_date_id;
    END IF;

    IF NEW.contract_id IS NOT NULL AND NEW.contract_id <> cd_contract THEN
      RAISE EXCEPTION 'contract_id % does not match contract_dates.contract_id %', NEW.contract_id, cd_contract;
    END IF;

    IF NEW.contract_id IS NULL THEN
      NEW.contract_id := cd_contract;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_log_contract_consistency()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
DECLARE
  cd_contract uuid;
BEGIN
  IF NEW.contract_date_id IS NOT NULL THEN
    SELECT contract_id INTO cd_contract
    FROM public.contract_dates
    WHERE id = NEW.contract_date_id;

    IF cd_contract IS NULL THEN
      RAISE EXCEPTION 'contract_date_id % not found', NEW.contract_date_id;
    END IF;

    IF NEW.contract_id IS NOT NULL AND NEW.contract_id <> cd_contract THEN
      RAISE EXCEPTION 'contract_id % does not match contract_dates.contract_id %', NEW.contract_id, cd_contract;
    END IF;

    IF NEW.contract_id IS NULL THEN
      NEW.contract_id := cd_contract;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.accept_pending_invites()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.recalc_contract_status(p_contract_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
BEGIN
  UPDATE public.contracts c
  SET
    status = CASE
      WHEN c.end_date IS NOT NULL
        OR EXISTS (
          SELECT 1 FROM public.contract_dates d
          WHERE d.contract_id = c.id
          LIMIT 1
        )
      THEN 'active'
      ELSE 'draft'
    END,
    updated_at = now()
  WHERE c.id = p_contract_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reminders_due(p_day date DEFAULT CURRENT_DATE)
  RETURNS TABLE(user_id uuid, contract_id uuid, contract_date_id uuid, channel text, fire_on_date date, sent_to text, subject text, dedupe_key text)
  LANGUAGE sql
  SET search_path = public
AS $function$
  SELECT
    rr.user_id,
    cd.contract_id,
    cd.id AS contract_date_id,
    rr.channel,
    p_day AS fire_on_date,
    COALESCE(p.notification_email, '') AS sent_to,
    CONCAT('Reminder: ', c.title, ' - ', cd.type, ' due ', cd.due_date) AS subject,
    CONCAT(rr.id, ':', cd.id, ':', p_day) AS dedupe_key
  FROM public.reminder_rules rr
  JOIN public.contract_dates cd
    ON (
      (rr.scope = 'contract_date' AND rr.contract_date_id = cd.id)
      OR
      (rr.scope = 'contract' AND rr.contract_id = cd.contract_id)
      OR
      (rr.scope = 'user')
    )
  JOIN public.contracts c ON c.id = cd.contract_id AND c.user_id = rr.user_id
  JOIN public.profiles p ON p.user_id = rr.user_id
  WHERE rr.enabled = true
    AND (
      cd.due_date
      - CASE rr.offset_unit
          WHEN 'day' THEN rr.offset_value
          WHEN 'week' THEN rr.offset_value * 7
          WHEN 'month' THEN rr.offset_value * 30
        END
    ) = p_day;
$function$;