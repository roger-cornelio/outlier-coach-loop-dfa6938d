

## Plano: Adicionar TABATA como tipo de tempo fixo no motor de calorias

### Problema confirmado
Você tem razão. O motor de calorias (`computeBlockKcalFromParsed.ts`) **não reconhece TABATA** como tempo fixo. Ele só reconhece AMRAP e EMOM.

Quando o bloco é "WARM UP (TABATA)":
1. `detectFixedTimeMinutes` retorna `null` (não conhece TABATA)
2. O motor calcula kcal de **1 passada** pelos exercícios (~0.3 kcal cada)
3. Nunca multiplica pelo tempo real (8 min)
4. Resultado: **~5 kcal** em vez de **~50-70 kcal**

Já existe `detectTabataTime` em `estimateWorkoutTime.ts` que resolve isso para estimativa de tempo, mas nunca foi integrado ao motor de calorias.

### Correção

**Arquivo: `src/utils/computeBlockKcalFromParsed.ts`**

Na função `detectFixedTimeMinutes`, adicionar detecção de TABATA:
- Regex para "TABATA" no título ou conteúdo
- Se detectar "TABATA" sem tempo explícito → default 4 min por exercício (formato clássico: 8×20s/10s = 4min)
- Se detectar "TABATA 8'" ou "8' TABATA" → usar o tempo explícito
- Contar exercícios no bloco para calcular duração total (ex: 2 exercícios × 4min = 8min)

**Arquivo: `src/utils/workoutStructures.ts`**

Adicionar TABATA como padrão reconhecido em `parseStructureLine`:
- `**TABATA**` → `FIXED_TIME` com valor calculado
- `**TABATA 8**` → `FIXED_TIME` com 8 min

### Lógica de duração TABATA
- Sem tempo explícito: 4 min por exercício no bloco (8 rounds × 20s work + 10s rest)
- Com tempo explícito (ex: "TABATA 8'"): usar o valor informado
- Com tempos customizados (ex: "Tabata 30/15"): calcular baseado nesses tempos × 8 rounds

### Resultado esperado

| Bloco | Antes | Depois |
|-------|-------|--------|
| WARM UP (TABATA) com 2 exercícios | ~5 kcal, ~0.5 min | ~50-70 kcal, 8 min |
| TABATA 4' | não detectado | 4 min fixo |

### Arquivos a modificar
- `src/utils/computeBlockKcalFromParsed.ts` — ~15 linhas na `detectFixedTimeMinutes`
- `src/utils/workoutStructures.ts` — ~10 linhas no `parseStructureLine`

