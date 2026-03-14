

# Correção: Estrelas invertidas + Mostrar todas as estações

## Problema
1. **Estrelas invertidas**: Maior gap (pior estação) deve ter **menos estrelas** (0-1), menor gap (melhor estação) deve ter **mais estrelas** (5). Atualmente usa `percentileToStars` que faz o oposto do desejado.
2. **"Ver todas" não mostra todas**: O filtro `improvement_value > 0` exclui estações sem gap, e a condição `totalBad > 3` usa percentis em vez do total real de `diagMelhorias`.

## Solução (1 arquivo: `DiagnosticRadarBlock.tsx`)

### Mudança 1 — Estrelas proporcionais ao desempenho (não ao gap)
Nova função `gapToStars(improvementValue, maxGap)`:
- `gap == 0` → 5 estrelas (meta batida, melhor desempenho)
- `gap == maxGap` → 0 estrelas (pior estação, maior necessidade de melhora)
- Intermediários: escala linear invertida `Math.round(5 * (1 - gap/maxGap))`

### Mudança 2 — Mostrar TODAS as estações ao expandir
- Remover filtro `improvement_value > 0` no modo expandido (`showAll`)
- Quando colapsado: top 3 com maior gap (como hoje)
- Quando expandido: todas as estações de `diagMelhorias`, ordenadas do maior gap ao menor
- Estações com gap 0: label "✓ Meta batida", 5 estrelas

### Mudança 3 — Botão "Ver todas" baseado em diagMelhorias
- Condição muda de `totalBad > 3` para `(diagMelhorias?.length || scores.length) > 3`
- Contador mostra total de estações, não apenas as "ruins"

### Arquivos
- `src/components/DiagnosticRadarBlock.tsx` — TrainingPrioritiesBlock (linhas ~1453-1613)

