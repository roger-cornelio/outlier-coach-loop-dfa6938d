

## Plano: Tempo real da prova no cabeçalho + soma exata dos splits

### Problema atual
1. O cabeçalho não mostra o tempo da prova atual do atleta
2. O total do "PR Atual" pode não bater com a soma real dos splits (arredondamentos ou splits faltando)

### Mudanças em `src/components/evolution/TargetSplitsTable.tsx`

**1. Cabeçalho com tempo da prova**
- Exibir o `finishTime` recebido como prop no subtítulo do card, ex: "Sua prova atual: 01:20:04"

**2. Total PR = soma real dos splits**
- O total já usa `rows.reduce((s, r) => s + r.currentPR, 0)` — a soma das estações mapeadas
- Garantir que `timeToSeconds` não arredonda (já não arredonda)
- Remover o `Math.round` do cálculo de `currentPR` se houver
- O `targetSplit` usa `Math.round(targetSec * weight)` — manter, pois é distribuição de peso

**3. Sem arredondamentos no PR**
- `prSplits[key]` vem direto de `timeToSeconds(s.time)` que retorna segundos exatos
- `formatEvolutionTime` usa `Math.round(Math.abs(totalSec))` — remover o round para manter fidelidade total, ou manter apenas no display final (segundos inteiros vindos do banco já são inteiros)

### Resultado
- Header mostra: "Sua prova atual: 01:20:04"
- Linha Total mostra soma exata de todas as 17 estações do banco
- Diferença = soma PR - soma Target (dados reais, sem chute)

