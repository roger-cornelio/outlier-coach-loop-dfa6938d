

## Problema Identificado

O **Diagnóstico** e o **Dashboard** calculam o gap de formas completamente diferentes:

| Local | Fonte do gap | Método |
|-------|-------------|--------|
| Diagnóstico (`DiagnosticRadarBlock`) | `hyrox_metric_scores` (percentis) | Heurística: cada ponto abaixo do P50 vale ~1.2-1.8s |
| Dashboard (`EvolutionProjectionCard`) | `diagnostico_melhorias` (improvement_value) | Soma direta dos `improvement_value` |

São duas fórmulas diferentes aplicadas a dados diferentes, por isso os números divergem.

## Solução

Unificar para que ambos usem a **mesma fonte de dados e fórmula**. A fonte mais confiável é o `diagnostico_melhorias.improvement_value` (dados reais da análise), que já é usada no Dashboard.

### Alteração em `DiagnosticRadarBlock.tsx`

1. O componente já recebe `diagnosticos` como prop (array de `DiagnosticoMelhoria`).
2. Substituir `calculateProjectedGain(scores)` por `diagnosticos.reduce((sum, d) => sum + (d.improvement_value || 0), 0)` — a mesma fórmula do `EvolutionProjectionCard`.
3. Isso garante que ambos mostrem exatamente o mesmo gap, mesmos meses, mesma taxa.

### Arquivo
- `src/components/DiagnosticRadarBlock.tsx` — alterar o `useMemo` do `evolutionProjection` (linha ~1677-1683) para usar `diagnosticos` em vez de `calculateProjectedGain(scores)`.

