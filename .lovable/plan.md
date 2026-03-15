

## Periodização OUTLIER — Texto Técnico e Vendedor

### Problema
1. Fallback `g.movement` mostra nomes crus de variáveis ("Run Total", "Sandbag Lunges") em vez de termos em português
2. O texto lista estações HYROX em vez de descrever o **foco de treino** (capacidades/valências)
3. Não usa IA — é um `useMemo` determinístico

### Solução

**Arquivo:** `src/components/DiagnosticRadarBlock.tsx`

1. **Criar mapeamento de métrica → foco de treino** (linguagem de periodização):

```typescript
const METRIC_TRAINING_FOCUS: Record<string, string> = {
  run_avg: 'resistência aeróbica e ritmo de corrida',
  roxzone: 'transições e capacidade anaeróbica',
  ski: 'potência de puxada e resistência cardiorrespiratória',
  sled_push: 'força de empurrada e potência de membros inferiores',
  sled_pull: 'força de puxada e grip',
  bbj: 'potência explosiva e coordenação',
  row: 'resistência de remada e eficiência cardiovascular',
  farmers: 'força de grip e estabilidade de core',
  sandbag: 'resistência muscular de membros inferiores',
  wallballs: 'potência de membros inferiores e resistência de ombro'
};
```

2. **Reescrever `trainingFocus`** para gerar texto que venda a direção do treino sem nomear estações:

```typescript
const trainingFocus = useMemo(() => {
  const gaps = [...(diagMelhorias || [])]
    .filter(d => d.improvement_value > 0)
    .sort((a, b) => b.improvement_value - a.improvement_value)
    .slice(0, 2); // max 2 para manter conciso

  if (gaps.length === 0) 
    return 'Foco em consolidação: desenvolvimento equilibrado de todas as valências.';

  const focuses = gaps.map(g => METRIC_TRAINING_FOCUS[g.metric] || METRIC_LABELS[g.metric] || g.metric);
  const joined = focuses.length === 1 ? focuses[0] : focuses[0] + ' e ' + focuses[1];

  return `Os treinos da próxima semana terão ênfase em ${joined} — os pontos com maior potencial de evolução identificados no seu diagnóstico.`;
}, [diagMelhorias]);
```

**Resultado exemplo:**
> "Os treinos da próxima semana terão ênfase em **resistência aeróbica e ritmo de corrida** e **resistência muscular de membros inferiores** — os pontos com maior potencial de evolução identificados no seu diagnóstico."

Em vez de:
> "Os treinos serão focados em Run Total, Sandbag Lunges e Ski Erg..."

### Impacto
- Apenas `DiagnosticRadarBlock.tsx` — adição do mapa `METRIC_TRAINING_FOCUS` + rewrite do `useMemo`
- Zero chamadas de IA, zero mudanças de backend

