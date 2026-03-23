

## Plano: Corrigir treino duplicado em todas as semanas

### Causa raiz

`WeeklyTrainingView.tsx` busca os treinos corretos por semana via `useAthletePlan()` (variável `planWorkouts`), mas **ignora esse dado** e usa `baseWorkouts`/`adaptedWorkouts` do Zustand store (linha 79-80). O store é global e só é atualizado pelo `Dashboard.tsx`. Quando o atleta navega entre semanas na `WeeklyTrainingView`, o store continua com os treinos da semana anterior — mostrando o mesmo treino de segunda em todas as semanas.

### Correção

| Arquivo | O que muda |
|---|---|
| `src/components/WeeklyTrainingView.tsx` | Usar `planWorkouts` do `useAthletePlan()` como fonte de dados para renderização, em vez de `baseWorkouts`/`adaptedWorkouts` do store. Manter adaptedWorkouts apenas como override quando disponíveis para a mesma semana. |

### Detalhes

Na linha 78-80, trocar:
```ts
const displayWorkouts = adaptedWorkouts.length > 0 ? adaptedWorkouts : baseWorkouts;
const currentWorkout = displayWorkouts.find((w) => w.day === activeDay);
```

Por:
```ts
const displayWorkouts = planWorkouts.length > 0 ? planWorkouts : [];
const currentWorkout = displayWorkouts.find((w) => w.day === activeDay);
```

Isso garante que cada semana mostra **apenas** os treinos publicados para aquela semana específica, usando a query filtrada por `week_start` que já existe no `useAthletePlan`.

