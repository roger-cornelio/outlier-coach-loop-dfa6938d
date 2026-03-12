

## Correção: Vírgula no Rank

### Problema
A função `extractNumeric` usa o regex `[^\d:.,]` que **preserva vírgulas e pontos**. Valores como `"1,305th"` viram `"1,305"` (ou pior, são truncados). Para campos de ranking (posição), queremos apenas o número inteiro (ex: `1305`).

### Solução
Tratar campos de ranking (`posicao_categoria`, `posicao_geral`) de forma diferente dos campos de tempo (`run_total`, `workout_total`):

- **Ranking**: extrair apenas dígitos, remover separadores de milhar → `"1,305th in Age Group"` → `"1305"`
- **Tempo**: manter o comportamento atual com `:` para formatos `MM:SS`

### Mudança

**`src/components/diagnostico/PerformanceHighlights.tsx`**
- Criar função `extractRank` que extrai apenas dígitos do início da string
- Usar `extractRank` para `posicao_categoria` e `posicao_geral`
- Manter `extractNumeric` para `run_total` e `workout_total`

### Técnico
```typescript
function extractRank(val: string | null | undefined): string {
  if (!val) return '—';
  // Remove thousand separators, then grab leading digits
  const cleaned = val.replace(/[.,]/g, '');
  const match = cleaned.match(/\d+/);
  return match ? match[0] : '—';
}
```

Os stats passam a indicar qual extractor usar:
```typescript
const stats = [
  { key: 'posicao_categoria', label: 'Rank Categoria', icon: Medal, isRank: true },
  { key: 'posicao_geral', label: 'Rank Geral', icon: MapPin, isRank: true },
  { key: 'run_total', label: 'Run Total', icon: Timer, isRank: false },
  { key: 'workout_total', label: 'Workout Total', icon: Dumbbell, isRank: false },
];
```

1 arquivo afetado.

