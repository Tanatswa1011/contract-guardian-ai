
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS slack_webhook_url text,
  ADD COLUMN IF NOT EXISTS slack_enabled boolean NOT NULL DEFAULT false;
