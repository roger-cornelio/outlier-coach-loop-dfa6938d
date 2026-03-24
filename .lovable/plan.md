

## Problema

O RoxCoach retorna tempos como **strings** (`"41:55"`, `"36:22"`) nos campos `your_score`, `top_1` e `improvement_value`. O código do `DiagnosticoGratuito.tsx` trata esses valores como números:

```
your_score: d.your_score || 0,   // "41:55" (string, não número)
top_1: d.top_1 || 0,             // "36:22" (string, não número)
```

Depois faz `diagnosticos.some(d => d.top_1 > 0)` — como `"36:22"` convertido a número é `NaN`, e `NaN > 0 = false`, o sistema sempre marca `roxCoachFailed = true`.

A tela de Evolução **nunca teve esse problema** porque usa `parseDiagnosticResponse` do `diagnosticParser.ts`, que tem a função `parseScoreValue` que detecta `:` e converte "MM:SS" para segundos.

## Solução

**1 arquivo: `src/pages/DiagnosticoGratuito.tsx`** (linhas 229-249)

Usar `parseScoreValue` (mesma lógica do `diagnosticParser.ts`) para converter os tempos "MM:SS" em segundos antes de atribuir aos campos numéricos:

- Importar ou criar inline a função `timeToSec` que converte "MM:SS" → segundos
- Aplicar nos campos `your_score`, `top_1`, `improvement_value` e `percentage` ao mapear `diagnostico_melhoria`
- A verificação `diagnosticos.some(d => d.top_1 > 0)` passará a funcionar corretamente

Nenhuma outra alteração necessária — o proxy está funcionando (os logs de rede confirmam resposta 200 com dados completos).

