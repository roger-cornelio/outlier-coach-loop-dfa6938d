

## Diagnóstico: Contagem de Sessões vs Régua de Progresso

### Problema identificado

Existem **dois sistemas de progresso separados** no app que não estão alinhados:

1. **Jornada OUTLIER** (`useJourneyProgress.ts` → `LevelProgress.tsx`): Conta sessões de treino via `countUniqueTrainingDays()`. Cada dia de treino completado = 1 sessão. Funciona com base em dias únicos do Zustand `workoutResults` + localStorage `outlier-benchmark-history`.

2. **Régua de Progresso** (`progressSystem.ts` → `ProgressRuler.tsx`): Calcula score baseado em **benchmark scores/buckets** (ELITE/STRONG/OK/TOUGH/DNF) com pesos temporais. **Não conta sessões de treino** — conta resultados de benchmark com notas.

O usuário espera que **cada treino completado suba 1%** da régua (para 100 sessões). Mas a régua atual usa scores de benchmark, não contagem de sessões.

### Problema secundário: sessões não contabilizadas

O `countUniqueTrainingDays` conta dias únicos (substring 0-10 da data). Se o atleta completa um treino, `addWorkoutResult` salva no Zustand (persistido). **Mas** o `handleFinishWorkout` usa `workoutId: selectedWorkout.day` (ex: 'seg'), e o campo `date` é ISO completo. A contagem deveria funcionar.

Possível causa: o atleta fez "Zerar Sessões" recentemente, ou os `workoutResults` no store estão sendo limpos por algum reset/reload.

### Regra desejada pelo usuário
- OPEN: 100 sessões de treino → cada treino = 1%
- A régua do dashboard deve refletir isso

### Plano de correção

**1. Atualizar `training_min_sessions` do OPEN para 100** (migração SQL)
```sql
UPDATE status_level_rules SET training_min_sessions = 100 WHERE level_key = 'OPEN';
```

**2. Garantir que `saveBenchmarkResult` no `useBenchmarkResults.ts` também salva no localStorage** quando o treino é finalizado
- Atualmente `handleFinishWorkout` chama `addWorkoutResult` (Zustand) mas **não** chama `saveBenchmarkResult` (que escreve no `outlier-benchmark-history`)
- `countUniqueTrainingDays` lê de **ambas** as fontes, mas se o localStorage não tem o registro, e o Zustand é limpo (reset), o dado se perde

**3. Em `WorkoutExecution.tsx` → `handleFinishWorkout`**: além de `addWorkoutResult`, também salvar no localStorage `outlier-benchmark-history` diretamente para garantir persistência dupla

**4. Em `LevelProgress.tsx`**: confirmar que a barra de treinos usa `journeyProgress.trainingSessions` / `journeyProgress.targetLevel.trainingRequired` (já está correto)

### Arquivos a alterar

| Arquivo | Mudança |
|---------|---------|
| Migração SQL | `training_min_sessions = 100` para OPEN |
| `src/components/WorkoutExecution.tsx` | Salvar sessão no localStorage `outlier-benchmark-history` ao finalizar treino |
| `src/hooks/useJourneyProgress.ts` | Nenhuma (já correto) |
| `src/components/LevelProgress.tsx` | Nenhuma (já correto) |

### Resultado esperado
- Cada treino completado aparece como +1 sessão na Jornada
- 100 treinos = 100% da barra para OPEN
- Dados persistem entre reloads via localStorage + Zustand

