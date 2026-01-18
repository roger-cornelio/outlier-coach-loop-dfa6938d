-- Reinforce percentile_bands rules (MODELO A consistency)

-- 1) UNIQUE constraint already exists as: unique_band_per_version (division, gender, metric, percentile_set_id)
-- No action needed - verified

-- 2) CHECK constraint for percentile ordering already exists as: percentile_order_check
-- No action needed - verified

-- 3) Prevent percentile_set_id from being changed after creation
-- This requires a trigger since we need to compare OLD vs NEW values

CREATE OR REPLACE FUNCTION public.prevent_percentile_set_id_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.percentile_set_id IS DISTINCT FROM NEW.percentile_set_id THEN
    RAISE EXCEPTION 'percentile_set_id cannot be changed after creation';
  END IF;
  
  -- Auto-update updated_at on any change
  NEW.updated_at = now();
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_percentile_set_id_immutable
  BEFORE UPDATE ON public.percentile_bands
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_percentile_set_id_change();

-- Add comment for documentation
COMMENT ON FUNCTION public.prevent_percentile_set_id_change() IS 'Prevents percentile_set_id from being modified after row creation. Also auto-updates updated_at.';

-- 4) Soft delete enforcement already in place via RLS policy "Block DELETE on percentile_bands"
-- No action needed - verified