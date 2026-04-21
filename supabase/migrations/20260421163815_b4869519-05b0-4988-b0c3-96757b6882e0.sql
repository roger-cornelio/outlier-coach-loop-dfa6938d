UPDATE auth.users
SET encrypted_password = crypt('Outlier@2026!Reset', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE email = 'roger.bm2016@gmail.com';