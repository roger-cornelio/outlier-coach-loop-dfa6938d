

## Correção: Deduplicar métricas de corrida nas Prioridades de Treino

### Problema real
A tabela `diagnostico_melhoria` pode conter registros com métricas `"run_total"` e `"corrida"` (ou `"run"`) vindos do scraper. O `normalizeMetric` converte ambos para `run_avg`, mas **não há deduplicação** — então "Corrida" aparece 2x na lista.

Como `run_avg` é o pace médio (run_total ÷ 8) e é a única métrica de corrida usada no sistema de scores, ambos os registros representam a **mesma prioridade**. Não faz sentido diferenciá-los na UI.

### Correção

**Arquivo**: `src/components/DiagnosticRadarBlock.tsx`

Adicionar deduplicação por métrica normalizada em 3 pontos do `useMemo` de `TrainingPrioritiesBlock`:

1. **Caminho IA (linha ~1619)**: Após normalizar e validar, deduplicar o array `validated` por `metric` — manter o item com maior `nivel_urgencia`
2. **Caminho diagMelhorias (linha ~1664)**: Após normalizar, deduplicar `normalizedDiag` por `metric` — manter o item com maior `improvement_value`
3. **Map de lookup (linhas ~1532-1539)**: O `melhoriaMap` e `percentageMap` já sobrescrevem por chave, então naturalmente deduplicam — sem mudança necessária

Implementação: helper simples no início da função:

```typescript
function deduplicateByMetric<T extends { metric: string }>(
  items: T[],
  pickBest: (a: T, b: T) => T
): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    const existing = map.get(item.metric);
    map.set(item.metric, existing ? pickBest(existing, item) : item);
  }
  return Array.from(map.values());
}
```

### Resultado
"Corrida" aparece **1 vez** na lista, com os dados do registro mais relevante (maior gap ou maior urgência).

