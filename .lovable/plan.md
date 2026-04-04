

## Plano: Corrigir bug da RPC `get_coach_overview`

### Problema
A view `coach_athlete_overview` tem 19 colunas (incluindo `onboarding_experience`, `onboarding_goal`, `onboarding_target_race`) mas a função RPC `get_coach_overview` só declara 16 colunas no RETURNS TABLE. O PostgreSQL mapeia por posição, então a coluna 13 (que na view é `onboarding_experience` tipo `text`) é esperada como `integer` (`days_inactive`) pela função — causando erro de tipo.

### Correção

**1. Migration** — Recriar a função `get_coach_overview` com as 3 colunas faltantes:
```sql
CREATE OR REPLACE FUNCTION public.get_coach_overview(_coach_id uuid)
RETURNS TABLE(
  coach_id uuid, athlete_id uuid, athlete_name text, athlete_email text,
  sexo text, account_status text, last_active_at timestamptz,
  peso numeric, altura integer, training_level text,
  unavailable_equipment jsonb, equipment_notes text,
  onboarding_experience text, onboarding_goal text, onboarding_target_race text,
  days_inactive integer, workouts_last_7_days integer,
  has_plan_this_week integer, total_benchmarks integer
) ...
```

**2. `src/hooks/useCoachOverview.ts`** — Adicionar os 3 campos ao interface `AthleteOverview` (já existem mas o fallback não os popula — ajustar fallback também).

**3. `src/components/CoachOverviewTab.tsx`** — Sem mudanças necessárias (os campos extras já são usados via fallback).

### Resultado
A RPC passa a funcionar sem fallback, retornando dados completos incluindo onboarding para o dashboard do coach.

