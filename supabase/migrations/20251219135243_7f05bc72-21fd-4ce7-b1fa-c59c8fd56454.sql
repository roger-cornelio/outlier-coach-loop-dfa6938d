-- =============================================
-- 1. CREATE COACH_APPLICATIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.coach_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  full_name text,
  email text,
  instagram text,
  box_name text,
  city text,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid REFERENCES public.profiles(id),
  rejection_reason text
);

-- Enable RLS
ALTER TABLE public.coach_applications ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coach_applications_user_id ON public.coach_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_coach_applications_status ON public.coach_applications(status);

-- =============================================
-- 2. RLS POLICIES FOR COACH_APPLICATIONS
-- =============================================

-- Users can view their own application
CREATE POLICY "Users can view own application"
ON public.coach_applications FOR SELECT
USING (
  user_id = public.get_profile_id(auth.uid())
);

-- Admins can view all applications
CREATE POLICY "Admins can view all applications"
ON public.coach_applications FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Users can insert their own application
CREATE POLICY "Users can insert own application"
ON public.coach_applications FOR INSERT
WITH CHECK (
  user_id = public.get_profile_id(auth.uid())
);

-- Users can update their own application ONLY if status is pending or rejected (to resubmit)
-- But they CANNOT change status to 'approved'
CREATE POLICY "Users can update own pending application"
ON public.coach_applications FOR UPDATE
USING (
  user_id = public.get_profile_id(auth.uid())
  AND status IN ('pending', 'rejected')
)
WITH CHECK (
  user_id = public.get_profile_id(auth.uid())
  AND status IN ('pending', 'rejected')  -- Prevent user from setting approved
);

-- Admins can update all applications (approve/reject)
CREATE POLICY "Admins can update all applications"
ON public.coach_applications FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 3. FUNCTION TO APPROVE COACH APPLICATION
-- =============================================

CREATE OR REPLACE FUNCTION public.approve_coach_application(
  _application_id uuid,
  _admin_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _auth_user_id uuid;
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve applications';
  END IF;

  -- Get the user_id from the application
  SELECT user_id INTO _user_id
  FROM public.coach_applications
  WHERE id = _application_id;

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Get the auth user_id from profiles
  SELECT p.user_id INTO _auth_user_id
  FROM public.profiles p
  WHERE p.id = _user_id;

  -- Update application status
  UPDATE public.coach_applications
  SET 
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = public.get_profile_id(_admin_id)
  WHERE id = _application_id;

  -- Add coach role to user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_auth_user_id, 'coach')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN true;
END;
$$;

-- =============================================
-- 4. FUNCTION TO REJECT COACH APPLICATION
-- =============================================

CREATE OR REPLACE FUNCTION public.reject_coach_application(
  _application_id uuid,
  _admin_id uuid,
  _reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can reject applications';
  END IF;

  -- Update application status
  UPDATE public.coach_applications
  SET 
    status = 'rejected',
    reviewed_at = now(),
    reviewed_by = public.get_profile_id(_admin_id),
    rejection_reason = _reason
  WHERE id = _application_id;

  RETURN true;
END;
$$;