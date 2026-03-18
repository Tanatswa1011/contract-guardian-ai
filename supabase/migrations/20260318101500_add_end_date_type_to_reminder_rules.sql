ALTER TABLE public.reminder_rules DROP CONSTRAINT IF EXISTS reminder_rules_date_type_check;
ALTER TABLE public.reminder_rules ADD CONSTRAINT reminder_rules_date_type_check CHECK (
  date_type = ANY (ARRAY['end', 'renewal', 'notice', 'payment', 'custom', 'all'])
);
