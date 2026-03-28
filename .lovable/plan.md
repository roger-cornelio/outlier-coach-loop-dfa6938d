

## Plano: Adicionar "Esqueci minha senha" na tela de login do coach

### Problema
O coach gui.pimenta tem conta criada mas não lembra a senha. Não existe opção de recuperação na tela `/login/coach`.

### Alterações

**1. `src/pages/CoachAuth.tsx`**
- Adicionar link "Esqueci minha senha" abaixo do campo de senha
- Ao clicar, exibir um mini-formulário (ou reutilizar o campo de email já preenchido) que chama `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/coach/redefinir-senha' })`
- Toast de confirmação: "Link de recuperação enviado para seu email"

**2. Nova página: `src/pages/CoachResetPassword.tsx`**
- Rota: `/coach/redefinir-senha`
- Detecta `type=recovery` no hash da URL (Supabase redireciona com isso)
- Formulário para digitar nova senha + confirmação
- Chama `supabase.auth.updateUser({ password })` para atualizar
- Após sucesso, redireciona para `/coach/dashboard`

**3. `src/App.tsx`**
- Adicionar rota `/coach/redefinir-senha` → `CoachResetPassword`
- Adicionar na lista `EXCLUDED_LAST_ROUTES`

### O que não muda
- Banco de dados, RPCs, tabelas, RLS
- Fluxo normal de login/criação de conta

