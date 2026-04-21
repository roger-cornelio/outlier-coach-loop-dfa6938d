

## Definir senha temporária para o superadmin via SQL

Você escolheu a opção 2: redefinir a senha do `roger.bm2016@gmail.com` direto no banco, sem depender de email.

### O que será feito

1. Executar uma migration no banco que atualiza o hash da senha do usuário `roger.bm2016@gmail.com` na tabela `auth.users` usando `crypt()` com algoritmo bcrypt (mesmo formato que o Supabase Auth usa nativamente).
2. Confirmar o email do usuário (`email_confirmed_at`) caso ainda não esteja confirmado, para garantir que o login funcione imediatamente.
3. Validar que a atualização foi aplicada com uma consulta de leitura.

### O que você precisa decidir

Qual senha temporária usar. Sugestão: algo forte e único, como `Outlier@2026!Reset` — você troca depois de entrar no app, em **Configurações → Alterar senha**.

**Me responda com a senha desejada** (pode ser a sugerida acima ou outra de sua escolha, mínimo 8 caracteres). Assim que você confirmar, eu aplico a migration.

### Após a aplicação

- Acesse `/login/admin` (rota onde você já está).
- Email: `roger.bm2016@gmail.com`
- Senha: a que você definir agora.
- Imediatamente após entrar, troque a senha para uma definitiva.

### Detalhes técnicos

- SQL usado: `UPDATE auth.users SET encrypted_password = crypt('<senha>', gen_salt('bf')), email_confirmed_at = COALESCE(email_confirmed_at, now()), updated_at = now() WHERE email = 'roger.bm2016@gmail.com';`
- Operação restrita ao registro do superadmin — nenhum outro usuário é afetado.
- Não toca em `user_roles`, `profiles` ou qualquer outra tabela — o papel de superadmin já está sincronizado via `ensure_superadmin_role`.

