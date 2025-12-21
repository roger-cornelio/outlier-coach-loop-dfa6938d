-- Create a new diagnostic function that returns JSON with status
CREATE OR REPLACE FUNCTION public.coach_find_athlete_by_email(_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller_id uuid := auth.uid();
  _normalized_email text;
  _auth_user_id uuid;
  _profile_record record;
  _is_coach_or_admin boolean;
BEGIN
  -- Verify caller is authenticated
  IF _caller_id IS NULL THEN
    RETURN jsonb_build_object('status', 'UNAUTHORIZED', 'message', 'Usuário não autenticado');
  END IF;

  -- Verify caller is a coach or admin
  IF NOT public.has_role(_caller_id, 'coach') AND NOT public.has_role(_caller_id, 'admin') THEN
    RETURN jsonb_build_object('status', 'FORBIDDEN', 'message', 'Apenas coaches e admins podem buscar atletas');
  END IF;

  -- Normalize email
  _normalized_email := lower(trim(_email));

  IF _normalized_email IS NULL OR _normalized_email = '' THEN
    RETURN jsonb_build_object('status', 'INVALID_EMAIL', 'message', 'Email inválido');
  END IF;

  -- Step 1: Search in auth.users
  SELECT au.id INTO _auth_user_id
  FROM auth.users au
  WHERE lower(trim(au.email)) = _normalized_email
  LIMIT 1;

  -- If not found in auth.users
  IF _auth_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'NO_AUTH_USER',
      'message', 'Esse e-mail ainda não criou conta no OUTLIER.'
    );
  END IF;

  -- Step 2: Check if profile exists
  SELECT p.id, p.user_id, p.name, p.email, p.coach_id
  INTO _profile_record
  FROM public.profiles p
  WHERE p.user_id = _auth_user_id
  LIMIT 1;

  -- If profile doesn't exist, create it
  IF _profile_record.id IS NULL THEN
    INSERT INTO public.profiles (user_id, email, name)
    VALUES (
      _auth_user_id,
      _normalized_email,
      split_part(_normalized_email, '@', 1)
    )
    RETURNING id, user_id, name, email, coach_id INTO _profile_record;

    -- Ensure user has the 'user' role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_auth_user_id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN jsonb_build_object(
      'status', 'PROFILE_CREATED',
      'message', 'Conta encontrada. Perfil criado automaticamente. Pode vincular.',
      'profile_id', _profile_record.id,
      'user_id', _profile_record.user_id,
      'name', _profile_record.name,
      'email', _profile_record.email,
      'coach_id', _profile_record.coach_id
    );
  END IF;

  -- Step 3: Check if user is coach or admin (not an athlete)
  _is_coach_or_admin := EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _auth_user_id
    AND ur.role IN ('coach', 'admin', 'superadmin')
  );

  IF _is_coach_or_admin THEN
    RETURN jsonb_build_object(
      'status', 'NOT_ATHLETE',
      'message', 'Esse e-mail é de coach/admin, não pode vincular.'
    );
  END IF;

  -- Step 4: Check if already linked to another coach
  IF _profile_record.coach_id IS NOT NULL AND _profile_record.coach_id != public.get_profile_id(_caller_id) THEN
    RETURN jsonb_build_object(
      'status', 'ALREADY_LINKED',
      'message', 'Este atleta já está vinculado a outro coach.'
    );
  END IF;

  -- Step 5: Check if already linked to this coach
  IF _profile_record.coach_id = public.get_profile_id(_caller_id) THEN
    RETURN jsonb_build_object(
      'status', 'ALREADY_YOURS',
      'message', 'Este atleta já está vinculado a você.'
    );
  END IF;

  -- Step 6: All good - athlete can be linked
  RETURN jsonb_build_object(
    'status', 'OK',
    'message', 'Atleta encontrado e disponível para vínculo.',
    'profile_id', _profile_record.id,
    'user_id', _profile_record.user_id,
    'name', _profile_record.name,
    'email', _profile_record.email,
    'coach_id', _profile_record.coach_id
  );
END;
$$;

-- Grant execute only to authenticated users
REVOKE ALL ON FUNCTION public.coach_find_athlete_by_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.coach_find_athlete_by_email(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.coach_find_athlete_by_email(text) TO authenticated;