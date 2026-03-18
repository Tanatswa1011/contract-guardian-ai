-- Allow auth user deletion to clean up dependent notification records
ALTER TABLE public.notification_queue
  DROP CONSTRAINT IF EXISTS notification_queue_user_id_fkey;

ALTER TABLE public.notification_queue
  ADD CONSTRAINT notification_queue_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.email_events
  DROP CONSTRAINT IF EXISTS email_events_user_id_fkey;

ALTER TABLE public.email_events
  ADD CONSTRAINT email_events_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;