

## Plano: Adicionar 5ª aba "Análise" no BenchmarksScreen + reverter navegação

### Alterações

**1. `src/components/BenchmarksScreen.tsx`**
- Importar `FatigueIndexCard` e `TargetSplitsTable`
- Importar `TrendingUp` do lucide
- Mudar `grid-cols-4` para `grid-cols-5` no `TabsList`
- Adicionar nova tab trigger "Análise" com ícone `TrendingUp`
- Adicionar novo `TabsContent` com os 2 componentes em stack (`space-y-6`)

**2. `src/components/AppSidebar.tsx`** (linha 87)
- Reverter `view: 'evolution'` → `view: 'benchmarks'`

**3. `src/components/MobileNav.tsx`** (linha 76)
- Reverter `view: 'evolution'` → `view: 'benchmarks'`

Resultado: menu "Evolução" volta a mostrar as 4 tabs anteriores + 1 tab nova "Análise" com FatigueIndex e TargetSplits.

