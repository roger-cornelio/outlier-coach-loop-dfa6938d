

## Plano: Conversão distância→reps para exercícios vertical_work

### Problema
Quando o coach escreve "20m Lunges", a IA retorna `distanceMeters: 20` e `reps: undefined`. O motor de cálculo usa `reps || 1`, resultando em 1 rep ao invés de ~50. Tempo e calorias ficam absurdamente baixos.

### Correção

**Arquivo**: `src/utils/computeBlockKcalFromParsed.ts` — função `computeExerciseKcal`

Na linha 85, onde hoje temos:
```
const reps = exercise.reps || 1;
```

Adicionar lógica: se o padrão é `vertical_work`, não há `reps`, mas há `distanceMeters`, converter distância em reps equivalentes dividindo pela distância padrão do pattern (`defaultDistanceMeters`).

Exemplo: 20m Lunge → `20 / 0.4 = 50 reps`. 10m Broad Jump → `10 / 0.3 = 33 reps`.

Se o padrão é `horizontal_friction` ou `metabolic` e tem `distanceMeters`, usar a distância diretamente (já funciona hoje).

**Arquivo**: `src/utils/energyCalculator.ts` — função `calculateExerciseKcal`

Aplicar a mesma lógica no caso `vertical_work`: se `repsOrDistance` veio de `distanceMeters` e o pattern é vertical_work, converter metros em reps equivalentes.

### Escopo
- 2 arquivos modificados, ~10 linhas cada
- Zero mudanças no banco, parser ou UI

