

## Plano: Superadmin acessa tela de atleta pelo /login

### Problema

O `AppGate` trata `/login` como: "se autenticado, redirecionar para dashboard do role". Para superadmin, isso sempre manda para `/painel-admin` — mesmo que a intenção seja testar a experiência de atleta.

### Solução

**1. AppGate — superadmin no /login vai para /app (não /painel-admin)**

Na lógica de redirect de usuário autenticado em `/login` (linhas 68-79), mudar o comportamento para superadmin: em vez de redirecionar para `/painel-admin`, redirecionar para `/app`. O superadmin já tem acesso irrestrito — faz mais sentido ele entrar pela porta de atleta quando usa o login de atleta.

**2. AppGate — superadmin pode acessar /app**

Atualmente, `/app` bloqueia coaches (redireciona para `/coach/dashboard`). Garantir que superadmin nunca seja bloqueado ali — já está coberto pela REGRA 2 (superadmin passa antes das verificações de rota), então não precisa de mudança.

**3. Index.tsx — superadmin pode editar nome do perfil**

No componente `AthleteConfig`, verificar se superadmin tem permissão de editar campos como nome. Se houver restrição, remover para superadmin.

### Arquivos alterados

1. **`src/components/AppGate.tsx`** — Alterar redirect de superadmin em `/login`: de `/painel-admin` para `/app`
2. **`src/components/AthleteConfig.tsx`** — Verificar se campos de perfil são editáveis para superadmin (se já for, nenhuma mudança necessária)

### Sem alteração no banco

