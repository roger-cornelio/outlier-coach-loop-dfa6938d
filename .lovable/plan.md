

## Plano: Superadmin/Coach em /coach-request → redirecionar para dashboard

### Problema
A página `/coach-request` não verifica se o usuário já tem acesso de coach ou superadmin. Resultado: superadmin vê formulário de solicitação desnecessário.

### Alteração

**Arquivo: `src/pages/CoachRequest.tsx`**

No início do componente, importar `useAuth` e verificar `isCoach` (que agora inclui superadmin). Se `isCoach === true`, redirecionar imediatamente para `/coach/dashboard` com `<Navigate>`.

```
Se isCoach → Navigate to="/coach/dashboard"
Senão → renderizar formulário normalmente
```

### O que não muda
- Formulário em si, banco de dados, fluxo de aprovação
- Usuários sem role de coach continuam vendo o formulário normalmente

