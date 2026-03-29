

## Plano: Separar bike/remo/ski da categoria "Corrida"

### Problema

Bike, remo e ski estão sendo detectados como "Corrida" tanto no `categoryValidation.ts` (keywords) quanto no `structuredTextParser.ts` (CONTENT_TYPE_PATTERNS). O usuário define que **Corrida = corrida pura** (run/running). Bike, remo e ski são cardio mas não são corrida.

### Decisão de design

Bike/remo/ski isolados devem ser classificados como **Metcon** (condicionamento), não como Corrida. Corrida é exclusivamente: run, running, corrida, trote, pace, km (quando associado a corrida).

### Alterações

**1. `src/utils/categoryValidation.ts`**
- Linha 83: remover `/ciclismo/i, /cycling/i, /remo/i, /\brow\b/i, /rowing/i, /ski/i, /bike/i, /airbike/i` das keywords de título de `corrida`
- Linha 84: remover os 2 regexes de bike e remo/ski do content de `corrida`
- Manter apenas: `corrida, running, run, trote, pace` como keywords de corrida

**2. `src/utils/structuredTextParser.ts`**
- Linha 736: remover `{ pattern: /\b(?:bike|airbike|assault)\b/i, type: 'corrida' }`
- Linha 737: remover `{ pattern: /\b(?:remo|row|rowing|ski|erg)\b/i, type: 'corrida' }`
- Blocos com bike/remo/ski sem formato metcon cairão no fallback `metcon` (linha 2599), que é o comportamento correto

### Sobre marcação de bloco principal

Já removida no plano anterior aprovado. Confirmar se ainda há resíduos de `isMainWod` toggle no editor — se houver, remover nesta mesma entrega.

### Resultado

| Conteúdo | Antes | Depois |
|----------|-------|--------|
| "5km corrida" | corrida ✅ | corrida ✅ |
| "2000m remo" | corrida ❌ | metcon ✅ |
| "20min bike" | corrida ❌ | metcon ✅ |
| "Ski Erg 1000m" | corrida ❌ | metcon ✅ |
| "AMRAP com 400m run" | metcon ✅ | metcon ✅ |

