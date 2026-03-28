

## Plano: Corrigir fluxo de definição de senha do coach

### Problema
Quando o admin aprova um coach, a edge function `create-coach-user` cria uma conta com senha aleatória e preenche `auth_user_id`. A RPC `get_coach_approval_by_email` usa `auth_user_id IS NOT NULL` como proxy para `has_password`. Resultado: o coach nunca vê a tela de definir senha — recebe "Senha incorreta" direto.

### Solução
Adicionar coluna `password_set` na tabela `coach_applications` para distinguir "conta criada pelo sistema" de "coach definiu sua própria senha".

### Alterações

**1. Migração SQL**
- Adicionar coluna `password_set boolean DEFAULT false` em `coach_applications`
- Atualizar RPC `get_coach_approval_by_email`: trocar `(auth_user_id IS NOT NULL)` por `COALESCE(ca.password_set, false)` no campo `has_password`

**2. `src/pages/CoachSetPassword.tsx`**
- Após definir senha com sucesso (signUp ou update-coach-password), marcar `password_set = true` na `coach_applications` via update direto ou chamada adicional

**3. `src/pages/CoachAuth.tsx`**
- Quando login falha com "Invalid credentials" e RPC retorna `approved && !has_password` → redireciona para `/coach/definir-senha` (já funciona, só precisa que o RPC retorne o valor correto)

### Fluxo corrigido
```text
Admin aprova → create-coach-user → auth_user_id preenchido, password_set=false
Coach acessa /login/coach → digita email+senha → login falha
  → RPC retorna has_password=false → redireciona para /coach/definir-senha
Coach define senha → password_set=true → login automático → /coach/dashboard
```

### O que não muda
- Lógica de aprovação, edge functions existentes, dashboard do coach

