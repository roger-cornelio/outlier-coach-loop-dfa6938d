-- =============================================
-- 1. UPDATE PROFILES TABLE
-- =============================================

-- Add missing columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS coach_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_active_at timestamp with time zone DEFAULT now();

-- Make email NOT NULL (update existing nulls first)
UPDATE public.profiles SET email = 'unknown@email.com' WHERE email IS NULL;
ALTER TABLE public.profiles ALTER COLUMN email SET NOT NULL;

-- Add unique constraint on email if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_unique'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
  END IF;
END $$;

-- Add index on coach_id for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_coach_id ON public.profiles(coach_id);

-- =============================================
-- 2. CREATE EVENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  properties jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_event_name ON public.events(event_name);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at DESC);

-- =============================================
-- 3. RLS POLICIES FOR PROFILES
-- =============================================

-- Drop existing policies to recreate
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Coach can view profiles of their athletes
CREATE POLICY "Coaches can view their athletes profiles"
ON public.profiles FOR SELECT
USING (
  public.has_role(auth.uid(), 'coach') 
  AND coach_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admin can update all profiles
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Users can insert their own profile (for signup)
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 4. RLS POLICIES FOR EVENTS
-- =============================================

-- Users can insert their own events
CREATE POLICY "Users can insert own events"
ON public.events FOR INSERT
WITH CHECK (
  user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
);

-- Users can view their own events
CREATE POLICY "Users can view own events"
ON public.events FOR SELECT
USING (
  user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
);

-- Coaches can view events of their athletes
CREATE POLICY "Coaches can view athlete events"
ON public.events FOR SELECT
USING (
  public.has_role(auth.uid(), 'coach')
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = events.user_id
    AND p.coach_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
  )
);

-- Admins can view all events
CREATE POLICY "Admins can view all events"
ON public.events FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete events
CREATE POLICY "Admins can delete events"
ON public.events FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 5. UPDATE HANDLE_NEW_USER TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile with name from metadata
  INSERT INTO public.profiles (user_id, email, name)
  VALUES (
    new.id, 
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name);
  
  -- Insert default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN new;
END;
$$;

-- =============================================
-- 6. HELPER FUNCTION TO GET PROFILE ID
-- =============================================

CREATE OR REPLACE FUNCTION public.get_profile_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;