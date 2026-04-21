-- Confirmar email manualmente para liberar login
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE id = '453e0d1f-6378-4257-8484-145c908a216d'
  AND lower(email) = 'roger@outlier.run';

-- Conceder role admin (idempotente)
INSERT INTO public.user_roles (user_id, role)
VALUES ('453e0d1f-6378-4257-8484-145c908a216d', 'admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;