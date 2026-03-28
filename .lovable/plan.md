

## Plano: Superadmin bypass no CoachAuth

### Problema
O `CoachAuth` (linha 122-133) chama `get_coach_approval_by_email` antes de tentar login. Como `roger.bm2016@gmail.com` não tem registro em `coach_applications`, a RPC retorna `app_exists: false` e redireciona para `/coach-request`.

### Alteração

**Arquivo: `src/pages/CoachAuth.tsx`**

No `handleLogin`, após normalizar o email (linha 119), antes de chamar a RPC, adicionar: tentar login primeiro. Se o login der certo e o usuário tiver role `superadmin` ou `coach`, redirecionar direto para `/coach/dashboard` — sem passar pela RPC de approval.

Fluxo corrigido:
1. Tentar `signInWithPassword`
2. Se login OK → checar `user_roles`
3. Se tem `superadmin`, `admin` ou `coach` → vai para `/coach/dashboard`
4. Se login falha (credentials inválidas) → aí sim chacar a RPC `get_coach_approval_by_email` para decidir o roteamento (request, pending, rejected, set-password)

Isso inverte a ordem: login primeiro, RPC de approval só como fallback para quem não conseguiu logar.

### O que não muda
- Banco de dados, RLS, tabelas
- Fluxo para coaches normais que ainda não têm conta (continuam passando pela RPC)
- Redirect automático no `useEffect` (linha 53) para quem já está logado

