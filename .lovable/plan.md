

## Plano: Superadmin com acesso irrestrito a todas as telas

### Problema

O `useAuth` define `isCoach = role === "coach"` (linha 83). Como superadmin tem `role = "superadmin"`, `isCoach` retorna `false`. Isso causa bloqueios em:

1. **Index.tsx linha 288**: `if (effectiveView === 'coachPerformance' && !isCoach)` → reseta para dashboard
2. **Index.tsx linha 222**: mesma lógica no useEffect, mas já trata `state !== 'superadmin'`
3. **Auth.tsx linha 293**: superadmin em `/login` é redirecionado para `/coach/dashboard` se `isCoach`, mas como não é, vai para `/app` — isso está ok, superadmin deve poder acessar `/app`

### Alteração

**Arquivo: `src/hooks/useAuth.tsx` (linha 83)**

Mudar de:
- `isCoach = role === "coach"`

Para:
- `isCoach = role === "coach" || role === "superadmin"`

Isso garante que superadmin herda todas as permissões de coach, assim como já herda as de admin (linha 82). Com isso, superadmin pode acessar views de coach no `/app`, acessar `/coach/dashboard`, e usar qualquer funcionalidade de coach.

**Arquivo: `src/pages/Index.tsx` (linha 288)**

Adicionar checagem de superadmin como fallback (já parcialmente feito na linha 222, mas inconsistente na 288):
- `if (effectiveView === 'coachPerformance' && !isCoach && state !== 'superadmin')` → com a mudança no useAuth, `isCoach` já será `true` para superadmin, tornando esta linha segura automaticamente.

### O que não muda
- Banco de dados, RLS, tabelas
- Fluxo de login para coach e atleta
- AppGate (já permite superadmin em tudo)

