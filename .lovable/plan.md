

## Plano: Fundir "Diagnóstico" e "Análise" em uma view contínua

### Contexto
Atualmente existem 5 abas: Diagnóstico | Análise | Provas | Simulados | Benchmarks. A aba "Análise" contém `FatigueIndexCard` e `TargetSplitsTable`. O pedido é fundir "Diagnóstico" + "Análise" em uma única view de scroll contínuo.

### Alterações

**`src/components/BenchmarksScreen.tsx`**
- Reduzir `grid-cols-5` → `grid-cols-4`
- Remover a `TabsTrigger` e `TabsContent` de `"analise"`
- Remover imports de `FatigueIndexCard`, `TargetSplitsTable`, `TrendingUp`
- Renomear a tab "Diagnóstico" para "Diagnóstico Completo"

**`src/components/RoxCoachDashboard.tsx`**
- Importar `FatigueIndexCard` e `TargetSplitsTable`
- Após o conteúdo existente do dashboard (que já inclui `ImprovementTable` e `DeepAnalysisBlock`), adicionar os dois componentes de análise em sequência com `space-y-6`
- Ordem final de scroll:
  1. Performance Highlights (existente)
  2. ImprovementTable — Diagnóstico de Melhoria (existente)
  3. DeepAnalysisBlock — Análise IA (existente)
  4. **FatigueIndexCard** — Resistência sob Fadiga (novo)
  5. **TargetSplitsTable** — Target Splits (novo)

