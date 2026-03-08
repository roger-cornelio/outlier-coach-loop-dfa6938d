

## Problema

O INSERT na tabela `discovered_events` retorna **403** (RLS violation). Todas as 4 policies da tabela são `RESTRICTIVE`:

1. `Admins can manage all events` (ALL, RESTRICTIVE) — exige role admin/superadmin
2. `Authenticated can read validated events` (SELECT, RESTRICTIVE) — só eventos VALIDADA
3. `Block anon discovered_events` (ALL, RESTRICTIVE) — bloqueia anon
4. `Users can insert events` (INSERT, RESTRICTIVE) — `auth.uid() IS NOT NULL`

O PostgreSQL exige que **pelo menos uma PERMISSIVE** passe **E todas as RESTRICTIVE** passem. Como não há nenhuma PERMISSIVE, o acesso é sempre negado. Além disso, a policy admin (ALL, RESTRICTIVE) bloqueia qualquer INSERT de não-admin.

## Correção

Migração SQL para corrigir as policies:

1. **DROP** as policies problemáticas
2. **Recriar** com a semântica correta:
   - `Admins can manage all events` → **PERMISSIVE** ALL para admin/superadmin
   - `Authenticated can read validated events` → **PERMISSIVE** SELECT (status = VALIDADA)
   - `Users can insert events` → **PERMISSIVE** INSERT (`auth.uid() IS NOT NULL`)
   - `Block anon` permanece RESTRICTIVE

Isso permite que usuários autenticados façam INSERT (policy permissiva de insert passa) e SELECT de eventos validados, enquanto admins podem fazer tudo.

