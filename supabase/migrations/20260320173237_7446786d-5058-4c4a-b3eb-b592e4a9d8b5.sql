-- Enable RLS on email_events (currently disabled — any authenticated user can read all events)
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

-- Users can only see their own email events
CREATE POLICY "email_events_select_own" ON public.email_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());