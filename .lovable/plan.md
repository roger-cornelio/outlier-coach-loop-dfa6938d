

## Plano: Corrigir Deteccao Tabata no Motor de Kcal

### Problema
O `detectFixedTimeMinutes` em `computeBlockKcalFromParsed.ts` retorna `4` fixo quando detecta "tabata" sem tempo explicito. Mas o modelo correto (ja implementado em `estimateWorkoutTime.ts`) e **4 minutos POR EXERCICIO** (8 rounds × 30s = 240s).

Com 2 exercicios (Squat to Stand + Pike Lunges), deveria ser 8 min, nao 4.

### Correcao

**Arquivo: `src/utils/computeBlockKcalFromParsed.ts`**

Na deteccao de Tabata dentro de `detectFixedTimeMinutes` (linhas ~443-444):
- Em vez de `return 4`, contar o numero de exercicios no `blockContent` (mesma logica que `estimateWorkoutTime.ts` ja usa)
- Retornar `exerciseCount * 4`

Logica de contagem: linhas que comecam com `-`, `•`, numero, ou letra (excluindo a propria linha "tabata" e linhas vazias).

### Resultado
- 2 exercicios → 8 min → floor = 8.0 × 75 × (8/60) = **80 kcal**
- 1 exercicio → 4 min → floor = **40 kcal**
- Consistente com `estimateWorkoutTime.ts`

