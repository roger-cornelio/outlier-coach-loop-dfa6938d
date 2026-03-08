

## Problema

Ao mudar o nome no perfil, o dashboard continua mostrando dados de diagnóstico, provas e métricas do "atleta anterior" porque tudo está vinculado ao `user_id` no banco. O nome é apenas cosmético — os dados persistem.

O usuário quer que mudar o nome = novo atleta = limpar dados antigos.

## Solução

Ao salvar um novo nome (diferente do atual), executar uma **limpeza completa** dos dados do atleta no banco e no estado local.

### 1. Criar função de limpeza no `useAthleteProfile`

**Arquivo:** `src/hooks/useAthleteProfile.ts`

Nova função `resetAthleteData(userId)` que:
- Deleta registros do atleta nas tabelas:
  - `benchmark_results` (provas importadas)
  - `hyrox_metric_scores` (scores diagnósticos)
  - `race_results` (resultados de prova)
  - `athlete_races` (provas alvo/satélite)
- Limpa localStorage: `outlier-benchmark-history`, `athlete-status-history`

### 2. Chamar reset no fluxo de save do `AthleteConfig`

**Arquivo:** `src/components/AthleteConfig.tsx`

No `handleSubmit`, quando `nameToSave` é definido (nome mudou):
1. Chamar `resetAthleteData(user.id)` antes de salvar
2. Limpar store Zustand: `resetToDefaults()` (limpa baseWorkouts, adaptedWorkouts, workoutResults)
3. Após salvar, redirecionar para dashboard com estado limpo

### 3. Limpar estado do store

Após reset dos dados, chamar `useOutlierStore.resetToDefaults()` para garantir que o estado local (treinos, resultados, etc.) também é zerado. Depois restaurar apenas o `athleteConfig` e `coachStyle` recém-salvos e setar `currentView = 'dashboard'`.

### Fluxo resultante

```
Atleta muda nome → handleSubmit detecta nameToSave
  → DELETE benchmark_results WHERE user_id = X
  → DELETE hyrox_metric_scores WHERE user_id = X  
  → DELETE race_results WHERE athlete_id = X
  → DELETE athlete_races WHERE user_id = X
  → Limpa localStorage (benchmark history, status)
  → resetToDefaults() no Zustand
  → Salva novo perfil
  → refreshProfile()
  → Dashboard abre limpo, sem dados antigos
```

