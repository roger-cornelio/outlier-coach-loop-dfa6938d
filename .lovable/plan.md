

## Plano: Unificar Referência de "Meta OUTLIER" entre Diagnóstico Gratuito e Tela de Evolução

### Causa Raiz da Divergência

As duas telas usam **fontes de dados diferentes** para calcular a "Meta OUTLIER":

- **Diagnóstico Gratuito** → usa `p10_sec` da tabela `percentile_bands` (calculado pela edge function `calculate-hyrox-percentiles` com `dry_run: true`)
- **Tela de Evolução (ImprovementTable)** → usa `top_1` da tabela `diagnostico_melhoria`, que vem da **API externa RoxCoach** (campo "Top 1%" parseado pelo `diagnosticParser.ts`)

São duas referências completamente independentes — o p10 interno e o "Top 1%" do RoxCoach. Por isso os números divergem (ex: Run Total mostra 36:23 num lugar e outro valor no outro).

### Solução: Fonte Única de Verdade

Fazer a **ImprovementTable** na tela de evolução usar os mesmos dados `p10_sec` da tabela `percentile_bands` (via `hyrox_metric_scores` já calculados e salvos), em vez de depender do `top_1` vindo do scraper externo.

### Implementação

**1. `src/components/diagnostico/ImprovementTable.tsx`**

- Receber `metricScores` (já recebe) que contém `p10_sec` de cada métrica (quando disponível do `calculate-hyrox-percentiles`)
- Para cada linha de `diagnostico_melhoria`, buscar o `p10_sec` correspondente do `metricScores` via match de `metric`
- Se encontrar `p10_sec`, usar como `top_1` (Meta OUTLIER) e recalcular `improvement_value = your_score - p10_sec`
- Se não encontrar (fallback), manter o `top_1` original do banco

**2. Onde a ImprovementTable é usada — verificar que `metricScores` é passado**

- Verificar os componentes pai que renderizam `ImprovementTable` e garantir que `metricScores` esteja sendo passado corretamente (provavelmente já está, mas preciso confirmar)

### O que NÃO muda

- DiagnosticoGratuito (já usa p10_sec corretamente)
- Edge function `calculate-hyrox-percentiles`
- Tabela `diagnostico_melhoria` (dados do scraper continuam salvos, mas a exibição prioriza p10_sec)
- Schema do banco (zero migrations)

### Resultado esperado

Uma mesma prova vai mostrar exatamente os mesmos números de "Meta OUTLIER", "Potencial de Evolução" e "% Foco" tanto no diagnóstico gratuito quanto na tela de evolução.

