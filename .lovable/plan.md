

## Conectar OutlierRadarChart aos Percentis Reais

### Mudanças

**1. `src/components/diagnostico/OutlierRadarChart.tsx`** — Reescrever

- Trocar props de `diagnosticos: DiagnosticoMelhoria[]` para `scores: CalculatedScore[]`
- Remover toda lógica de keywords/string-matching
- Novo mapeamento direto por metric name:

```text
Cardio     → avg(run_avg, row)
Força      → avg(sled_push, sled_pull)
Potência   → wallballs
Anaeróbica → avg(ski, bbj)
Core       → avg(sandbag, farmers)
Eficiência → roxzone
```

- Score = `percentile_value` direto (já 0-100), fallback 50 se métrica ausente
- Zero mudanças visuais (cores, grid, layout mantidos)

**2. `src/components/RoxCoachDashboard.tsx`** — Editar

- Importar `useDiagnosticScores` e `CalculatedScore`
- Chamar `useDiagnosticScores()` no componente
- Passar `scores` para `OutlierRadarChart` em vez de `diagnosticos`
- Condicionar renderização do radar em `diagnosticScores.hasData` (independente de `diagnosticos.length`)

2 arquivos editados, zero mudanças visuais.

