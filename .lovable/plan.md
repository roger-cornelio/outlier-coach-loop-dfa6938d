

# Unificar Ganho e Projeção de Evolução

## Problema
O cabeçalho mostra "Ganho = 6m21s" (gap até PRO) e a Projeção mostra "gap de 6min 15s" (soma dos improvement_value por estação). São cálculos independentes que confundem o atleta quando aparecem juntos.

## Solução
Unificar a fonte de dados: a Projeção de Evolução deve usar o **mesmo gap do cabeçalho** (tempo atual − meta PRO/ELITE) como referência principal, em vez da soma dos improvement_value.

### Alteração em `DiagnosticRadarBlock.tsx`

1. **evolutionProjection**: trocar a fonte do `totalGap` de `diagMelhorias.reduce(...)` para `currentTime - targetSec` (mesma conta do "Ganho" no cabeçalho)
2. **Fallback**: se não houver `eliteTarget`, manter o cálculo atual por `diagMelhorias` como fallback
3. O `gapFormatted` na Projeção passará a exibir exatamente o mesmo valor que o "Ganho"

### Alteração em `EvolutionProjectionCard.tsx`
- Aceitar `totalGapOverride` como prop opcional para receber o gap já calculado do dashboard
- Se presente, usar esse valor em vez de recalcular internamente

### Resultado
- Cabeçalho e Projeção mostram o mesmo número (6m21s = 6m21s)
- Zero confusão visual para o atleta
- Lógica interna de meses/taxa permanece idêntica

### Arquivos alterados
- `src/components/DiagnosticRadarBlock.tsx`
- `src/components/diagnostico/EvolutionProjectionCard.tsx`

