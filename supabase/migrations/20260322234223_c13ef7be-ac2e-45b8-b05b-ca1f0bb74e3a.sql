
-- Push subscriptions table for Web Push Notifications
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth_key text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users can insert own push subscriptions"
  ON public.push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own push subscriptions"
  ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscriptions"
  ON public.push_subscriptions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Block anonymous access
CREATE POLICY "Block anon push_subscriptions"
  ON public.push_subscriptions FOR ALL
  TO anon
  USING (false);

-- Service role / edge functions need to read subscriptions for sending
-- This is handled by the service_role key in edge functions
