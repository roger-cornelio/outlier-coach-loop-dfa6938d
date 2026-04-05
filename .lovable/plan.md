

## Plano: Corrigir cálculo de tempo/calorias para blocos de corrida por zona

### Problema
O bloco de corrida com formato "5 min corrida 07:15–05:36 Z1" mostra **2 min / ~9 kcal** em vez de **50 min / ~398 kcal**. São dois problemas em cadeia:

1. **IA não reconhece o formato**: O prompt do parser tem exemplo para "Corrida contínua 30min Z2" mas não para "5 min corrida 07:15–05:36 Z1". A IA provavelmente não extrai `durationSeconds` corretamente dessas 4 linhas.

2. **Estimador de texto falha**: O fallback (`estimateWorkoutTime`) busca distâncias em metros ("400m corrida") mas não reconhece duração em minutos ("5 min corrida"), então retorna ~0.

### Solução

**1. Adicionar few-shot example ao prompt da IA** (`supabase/functions/parse-workout-blocks/index.ts`)

Adicionar exemplo para corrida por zona com pace range:
```
Input block title: "Corrida", content:
"5 min corrida 07:15–05:36 Z1\n20 min corrida 05:31–04:54 Z2\n20 min corrida 04:50–04:36 Z3\n5 min corrida 07:15–05:36 Z1"

Output: [
  {"slug":"running","name":"Running","movementPatternSlug":"distance_cardio","sets":1,"durationSeconds":300,"intensityType":"zone","intensityValue":1,"notes":"Pace 07:15–05:36"},
  {"slug":"running","name":"Running","movementPatternSlug":"distance_cardio","sets":1,"durationSeconds":1200,"intensityType":"zone","intensityValue":2,"notes":"Pace 05:31–04:54"},
  {"slug":"running","name":"Running","movementPatternSlug":"distance_cardio","sets":1,"durationSeconds":1200,"intensityType":"zone","intensityValue":3,"notes":"Pace 04:50–04:36"},
  {"slug":"running","name":"Running","movementPatternSlug":"distance_cardio","sets":1,"durationSeconds":300,"intensityType":"zone","intensityValue":1,"notes":"Pace 07:15–05:36"}
]
```

Também adicionar regra geral no prompt: "X min corrida/remo/ski" = `durationSeconds: X*60`, pace ranges (07:15–05:36) vão em `notes`.

**2. Melhorar estimador de texto** (`src/utils/estimateWorkoutTime.ts`)

Adicionar detecção de padrão "X min corrida/run/remo/ski" para o fallback funcionar quando a IA não está disponível.

### Arquivos alterados
- `supabase/functions/parse-workout-blocks/index.ts` — novo example + regra de duração
- `src/utils/estimateWorkoutTime.ts` — regex para "X min corrida"

### Resultado
- Bloco de corrida por zona calcula corretamente: ~50 min, ~398 kcal
- Funciona tanto com IA quanto com fallback de texto

