
CREATE TABLE public.enterprise_inquiries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  company_name text NOT NULL,
  team_size text,
  message text,
  source text NOT NULL DEFAULT 'pricing_page',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.enterprise_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enterprise_inquiries_insert_authenticated"
  ON public.enterprise_inquiries
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "enterprise_inquiries_select_own"
  ON public.enterprise_inquiries
  FOR SELECT
  TO authenticated
  USING (email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())::text);
