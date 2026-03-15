

## Plano: Conectar FatigueIndexCard e TargetSplitsTable aos dados reais de `tempos_splits`

### Contexto

Ambos os componentes usam dados mockados (`MOCK_RUNS` e `MOCK_CURRENT_PRS` de `evolutionUtils.ts`). Os dados reais já existem no `RoxCoachDashboard` como `splits: Split[]` (tabela `tempos_splits`) com `split_name` ("Running 1".."Running 8", "Ski Erg", etc.) e `time` (string "MM:SS"). O `selectedResumo?.finish_time` contém o tempo total da prova.

### Alterações (4 arquivos)

**1. `src/components/RoxCoachDashboard.tsx`** (linhas 457-458)
Passar props reais já disponíveis no escopo:
```tsx
<FatigueIndexCard splits={splits} />
<TargetSplitsTable splits={splits} finishTime={selectedResumo?.finish_time} />
```

**2. `src/components/evolution/FatigueIndexCard.tsx`**
- Adicionar prop `splits?: Split[]` (importar `Split` e `timeToSeconds` de `diagnostico/types`)
- Remover import de `MOCK_RUNS`
- Criar `useMemo` que extrai os 8 running splits reais: `splits.find(s => s.split_name === 'Running N')` → `timeToSeconds(split.time)`
- Calcular fadiga com os dados reais (mesma fórmula: `(avg_run2-7 - run1) / run1 * 100`)
- Se dados insuficientes (<8 runs ou sem splits), mostrar empty state com ícone de cadeado e texto "Aguardando dados de corrida completos"

**3. `src/components/evolution/TargetSplitsTable.tsx`**
- Adicionar props `splits?: Split[]` e `finishTime?: string`
- Remover import de `MOCK_CURRENT_PRS`
- Criar `useMemo` que mapeia splits reais para `Record<string, number>`:
  - `run_total` = soma dos 8 Running splits
  - Estações mapeadas pelo `split_name` ("Ski Erg"→ski, "Sled Push"→sled_push, etc.)
- Usar `finishTime` como valor inicial do input de meta (em vez de "01:08:00" hardcoded)
- Se sem dados, mostrar empty state com ícone de cadeado e texto "Importe uma prova para liberar o Target Splits"

**4. `src/utils/evolutionUtils.ts`**
- Remover exports `MOCK_RUNS` e `MOCK_CURRENT_PRS`
- Manter: `ELITE_WEIGHTS`, `STATION_LABELS`, `formatEvolutionTime`, `parseTimeInput`, constantes de pódio

### Mapeamento split_name → chave interna

```text
"Running 1..8"       → run_1..run_8 (somados para run_total)
"Ski Erg"            → ski
"Sled Push"          → sled_push
"Sled Pull"          → sled_pull
"Burpee Broad Jump"  → bbj
"Rowing"             → row
"Farmers Carry"      → farmers
"Sandbag Lunges"     → sandbag
"Wall Balls"         → wall_balls
"Roxzone"            → roxzone
```

### Impacto
- Zero alterações no banco de dados
- Zero alterações em RLS
- Apenas refatoração frontend: mocks → dados reais já disponíveis no componente pai

