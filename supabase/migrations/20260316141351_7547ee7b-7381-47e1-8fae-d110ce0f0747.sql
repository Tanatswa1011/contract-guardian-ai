
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.schedule(
  'send-contract-reminders-daily',
  '0 7 * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://ybyhiklkcsehhhcjodxi.supabase.co/functions/v1/send-contract-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlieWhpa2xrY3NlaGhoY2pvZHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NDY4MjAsImV4cCI6MjA4NzQyMjgyMH0.boCCiXhdmbbG9cyg4jJ5X8ZvbGVJ9ZvO7H-94R3wKqI"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
