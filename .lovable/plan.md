

## Plano: Zerar treinos semanais ao trocar de coach

### Problema
Quando o atleta troca de coach, os planos antigos do coach anterior continuam aparecendo na visão semanal. O novo coach não consegue publicar livremente porque há conflito com registros existentes (RLS + UPSERT).

### Solução

Dois pontos de ação:

**1. Na função `unlink_current_coach` — marcar planos antigos como arquivados**

Alterar a função RPC para, ao desvincular, mudar o `status` dos planos ativos/publicados para `'archived'` (não deletar — preserva histórico). Isso faz com que o `useAthletePlan` (que filtra `status = 'published'`) não mostre mais esses treinos.

```sql
-- Dentro de unlink_current_coach, ANTES de deletar coach_athletes:
UPDATE public.athlete_plans 
SET status = 'archived'
WHERE athlete_user_id = _athlete_id 
  AND status = 'published'
  AND week_start >= date_trunc('week', now())::date;
```

Apenas planos da semana atual e futura são arquivados. Planos de semanas passadas permanecem como histórico.

**2. RLS UPDATE policy — já corrigida no plano anterior**

A policy UPDATE via `coach_athletes` já permite que o coach vinculado atualize. Com os planos antigos arquivados, o novo coach faz INSERT limpo sem conflito.

### Dados preservados
- Planos arquivados continuam no banco (`status = 'archived'`)
- Registros de execução (`benchmark_results`, `workout_completions`) não são tocados
- Histórico do atleta permanece intacto

### Arquivo alterado
- **Migration SQL** — atualizar função `unlink_current_coach` para arquivar planos ativos

