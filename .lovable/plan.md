

## Problema

A tela de execução do treino (`WorkoutExecution.tsx`) usa fontes de dados **diferentes** da tela de visualização semanal (`WeeklyTrainingView.tsx`) para tempo e calorias:

| Dado | WeeklyTrainingView (antes) | WorkoutExecution (durante) |
|------|---------------------------|---------------------------|
| Tempo | `computeBlockMetrics` (motor físico) → fallback `estimateBlock` | `getBlockTimeMeta` (outra lógica) |
| Kcal | `computeBlockMetrics` → fallback `estimateBlock` | `estimateWorkout` (MET básico) |

Exemplo: um bloco **90' EMOM** aparece como **~90min** antes de iniciar, mas **~15min** durante a execução.

## Solução

Alinhar `WorkoutExecution.tsx` para usar **exatamente a mesma lógica** de `WeeklyTrainingView.tsx`:

### Arquivo: `src/components/WorkoutExecution.tsx`

1. **Importar** `computeBlockMetrics` de `@/utils/computeBlockKcalFromParsed`

2. **Substituir o cálculo por bloco** (linhas ~432-437) — trocar:
   - `getBlockTimeMeta` + `workoutEstimation.blocks[index]`
   
   Por:
   - `computeBlockMetrics` (se `parsedExercises` existe) → fallback `estimateBlock` (mesmo padrão do WeeklyTrainingView)

3. **Remover** o `useMemo` de `workoutEstimation` (linha ~337-340) que usa `estimateWorkout` — não será mais necessário

4. **Manter** o `useMemo` de `biometrics` (linha 342) — continua sendo usado

### Lógica por bloco (idêntica ao WeeklyTrainingView):
```text
if (block.parsedExercises && block.parseStatus === 'completed') {
  → computeBlockMetrics(parsedExercises, biometria, content, title)
  → dur = metrics.estimatedDurationSec
  → kcal = metrics.estimatedKcal
} else {
  → estimateBlock(block, biometrics, level)
  → dur = blockEst.estimatedMinutes * 60
  → kcal = blockEst.estimatedKcal
}
estimatedMinutes = Math.round(dur / 60)
isEstimated = !hasParsedData
```

### O que NÃO muda
- Lógica de recording inline (tempo real do atleta, AMRAP rounds, etc.)
- `estimatedSeconds` usado para feedback local (comparação real vs estimado) — esse continuará usando `getBlockTimeMeta` internamente no `handleRecordBlock`
- WeeklyTrainingView — já funciona corretamente
- Nenhum hook, tipo ou edge function alterado

