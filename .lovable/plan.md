

## Plano: Renomear coluna e corrigir total

### Diagnóstico
Consultei o banco: a soma dos 17 splits dá **4804s** mas o finish_time real é **4797s** (01:19:57). Diferença de 7s causada por arredondamentos nos tempos parciais do scraper. O total não deve ser calculado somando splits — deve usar o `finishTime` real da prova.

### Mudanças em `src/components/evolution/TargetSplitsTable.tsx`

1. **Renomear coluna**: "PR Atual" → "Última Prova" no `TableHead`
2. **Total da Última Prova**: Usar `finishTime` convertido para segundos (via `parseTimeInput`) em vez de `rows.reduce(...)` — assim o total bate exatamente com o tempo oficial da prova
3. **Diferença total**: Calcular como `finishTimeSec - totalTarget` (tempo real da prova menos soma dos targets)

### Resultado
- Coluna se chama "Última Prova"
- Linha Total mostra 01:19:57 (tempo real), não 01:20:04 (soma arredondada)
- Diferença reflete a realidade

