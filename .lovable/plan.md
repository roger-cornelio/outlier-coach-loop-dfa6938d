

## Plano: Personalizar DailyBriefingCard por dia selecionado

### Problemas

1. O card sempre usa o dia **real** (ex: domingo) via `getCurrentDayOfWeek()`, ignorando o dia que o atleta selecionou na aba
2. O tempo estimado usa `estimateWorkout()` que diverge do cálculo real usado na view (`computeBlockMetrics`)

### Solução

**Editar `src/components/DailyBriefingCard.tsx`:**
- Aceitar props opcionais: `workout?: DayWorkout` e `allWorkouts?: DayWorkout[]`
- Quando receber `workout` via prop, usar esse treino em vez de buscar pelo dia atual no store
- Para tempo estimado, somar `durationSec` dos blocos via `computeBlockMetrics` (mesma fonte que a view usa), em vez de `estimateWorkout`
- Manter fallback atual (buscar no store pelo dia real) quando usado sem props

**Editar `src/components/WeeklyTrainingView.tsx`:**
- Passar o `sessionWorkout` e `displayWorkouts` como props para o `DailyBriefingCard`:
  ```
  <DailyBriefingCard workout={sessionWorkout} allWorkouts={displayWorkouts} />
  ```

### Resultado
- Cada dia mostra mensagem diferente com tipos, bloco principal e intensidade corretos
- Tempo bate com o que aparece nos blocos abaixo
- Frase final continua rotativa por dia real (mantém variedade)

