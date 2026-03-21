

## Plano: Corrigir Detecção de AMRAP/EMOM com Número Antes do Nome

### Problema
Tanto AMRAP quanto EMOM falham quando o título usa o formato invertido — número antes do nome (ex: **"15' AMRAP"**, **"10' EMOM"**). O regex atual só reconhece **"AMRAP 15'"** e **"EMOM 10'"**.

Quando a detecção falha, `fixedTimeMinutes` retorna `null` e o motor calcula apenas a duração dos exercícios individuais (~1-2 min), sem escalar para o tempo fixo. Por isso kcal fica muito baixo.

### Correção

**Arquivo: `src/utils/computeBlockKcalFromParsed.ts`**

Na função `detectFixedTimeMinutes` (após linha 402), adicionar 2 regex para o padrão invertido:

```
10' EMOM  →  /(\d+)\s*['′]?\s*(?:min\s*)?EMOM/i
15' AMRAP →  /(\d+)\s*['′]?\s*(?:min\s*)?AMRAP/i
```

### Resultado

| Título | Antes | Depois |
|--------|-------|--------|
| 15' AMRAP | ❌ ~2 min, ~26 kcal | ✅ 15 min, ~130+ kcal |
| 10' EMOM | ❌ ~1 min, ~10 kcal | ✅ 10 min, ~80+ kcal |
| AMRAP 15' | ✅ já funciona | ✅ sem mudança |
| EMOM 10' | ✅ já funciona | ✅ sem mudança |

### Arquivo modificado
- `src/utils/computeBlockKcalFromParsed.ts` — ~10 linhas adicionadas

