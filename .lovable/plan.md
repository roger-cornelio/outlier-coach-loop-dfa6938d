

## Plano: AMRAP/EMOM — Detecção de tempo fixo no motor de cálculo

### Problema resolvido
Quando o coach escreve "AMRAP 15'" (seja no título ou no conteúdo do bloco), o motor calculava apenas o tempo de 1 round (~2 min) ao invés de 15 minutos. Calorias também ficavam subestimadas.

### Correção implementada

**Arquivo**: `src/utils/computeBlockKcalFromParsed.ts`

1. Nova função `detectFixedTimeMinutes(blockContent?, blockTitle?)`:
   - Analisa linhas do conteúdo com `parseStructureLine()` buscando `FIXED_TIME`
   - Se não encontrar no conteúdo, faz fallback para o título do bloco
   - Retorna minutos ou null

2. `computeBlockMetrics` agora aceita `blockTitle?: string` como 4º parâmetro:
   - Após calcular tempo e kcal normais (1 round), verifica se há FIXED_TIME
   - Se sim: `estimatedDurationSec = fixedTimeMinutes * 60`
   - Escala kcal: `totalKcal *= (fixedTimeSec / totalDurationSec)`

**Arquivo**: `src/components/WeeklyTrainingView.tsx`
- Chamada atualizada para passar `block.title` como 4º argumento

### Escopo
- 2 arquivos modificados
- Zero mudanças no banco de dados
- Funciona para AMRAP e EMOM, tanto no título quanto no conteúdo
