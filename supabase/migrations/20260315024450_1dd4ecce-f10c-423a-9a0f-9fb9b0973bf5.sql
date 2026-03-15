
CREATE OR REPLACE FUNCTION public.search_public_athletes(search_term text)
 RETURNS TABLE(id uuid, name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.user_id as id, COALESCE(p.name, split_part(p.email, '@', 1)) as name
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'user')
    AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'coach')
    AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role IN ('admin', 'superadmin'))
    AND (
      search_term = '' 
      OR search_term IS NULL 
      OR p.name ILIKE '%' || search_term || '%' 
      OR p.email ILIKE search_term || '%'
    )
  ORDER BY name ASC
  LIMIT 500;
END;
$$;
