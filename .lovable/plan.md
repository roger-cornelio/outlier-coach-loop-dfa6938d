

## Plano: Remover aba Parâmetros do CoachDashboard

### Alteração

**Arquivo: `src/pages/CoachDashboard.tsx`**

1. Remover o `TabsTrigger` de "parametros" (linhas ~723-727) — incluindo o wrapper `{isSuperAdmin && ...}`
2. Remover o `case 'parametros'` no render de conteúdo (linhas ~626-627)
3. Remover import do `AdminParamsEditor` (linha 37) e `Settings2` se não usado em outro lugar

A aba de Parâmetros continuará acessível apenas pelo portal admin (`/admin`), não mais pelo dashboard do coach.

### O que não muda
- O componente `AdminParamsEditor` continua existindo
- Acesso via portal admin permanece intacto

