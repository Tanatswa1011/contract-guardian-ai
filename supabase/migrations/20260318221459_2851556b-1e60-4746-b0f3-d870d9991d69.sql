-- Allow Supabase Auth admin to perform cascading deletes from auth.users into public tables
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

GRANT SELECT, DELETE ON TABLE
  public.profiles,
  public.workspaces,
  public.workspace_members,
  public.workspace_invites,
  public.contracts,
  public.contract_dates,
  public.contract_files,
  public.extraction_runs,
  public.reminder_rules,
  public.notification_log,
  public.notification_queue,
  public.email_events
TO supabase_auth_admin;