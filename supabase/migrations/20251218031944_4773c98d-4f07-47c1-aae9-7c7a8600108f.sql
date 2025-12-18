-- Create function to check if user can view athlete data
CREATE OR REPLACE FUNCTION public.can_view_athlete_data(_viewer_id uuid, _athlete_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- User can always view their own data
  IF _viewer_id = _athlete_id THEN
    RETURN true;
  END IF;
  
  -- Admins can view all data
  IF public.has_role(_viewer_id, 'admin') THEN
    RETURN true;
  END IF;
  
  -- Coaches can view data of athletes assigned to them
  IF public.has_role(_viewer_id, 'coach') THEN
    RETURN EXISTS (
      SELECT 1 FROM public.coach_athletes
      WHERE coach_id = _viewer_id AND athlete_id = _athlete_id
    );
  END IF;
  
  RETURN false;
END;
$$;