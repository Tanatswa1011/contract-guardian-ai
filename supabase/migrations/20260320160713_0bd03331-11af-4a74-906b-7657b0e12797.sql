CREATE TABLE public.pro_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  workspace_name text,
  source text NOT NULL DEFAULT 'billing_page',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pro_waitlist_email_unique UNIQUE (email)
);

ALTER TABLE public.pro_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waitlist_insert_authenticated"
  ON public.pro_waitlist
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "waitlist_select_own"
  ON public.pro_waitlist
  FOR SELECT
  TO authenticated
  USING (
    email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
  );