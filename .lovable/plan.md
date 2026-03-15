

## Plano: Substituir Plano de Prova estático por Calculadora de Pace no Simulador

### O que muda

Remover o bloco "Seu Plano de Prova" (RacePlanCard estático via localStorage) do `SimulatorScreen` e substituir pelo componente `TargetSplitsTable` — a mesma calculadora interativa que já existe na aba Evolução.

### Diferença para a versão da aba Evolução

- **Dados de entrada**: Em vez de usar splits de provas oficiais (`benchmark_results`), usa os splits do **último simulado** do atleta
- **Tempo-alvo default**: Usa o `total_time` do último simulado como valor inicial do campo "Tempo-alvo"
- **Título**: "Calculadora de Pace Ideal" (conforme imagem de referência)

### Mudança única: `src/components/simulator/SimulatorScreen.tsx`

1. **Remover** imports de `RacePlanCard` e estado `racePlan` + `useEffect` do localStorage
2. **Adicionar** import do `TargetSplitsTable`
3. **Converter** splits do último simulado (`SplitData[]`) para o formato `Split[]` que o TargetSplitsTable espera:
   - Mapear phase index para split_name correto (ex: phase 0 → "Running 1", phase 1 → "Ski Erg", etc.)
   - Converter `time_seconds` para string "MM:SS" ou "HH:MM:SS"
4. **Substituir** o bloco `{racePlan && ...}` pelo `TargetSplitsTable` passando:
   - `splits` = splits convertidos do último simulado
   - `finishTime` = `formatTime(simulations[0].total_time)` (último simulado)
   - `title` = "Calculadora de Pace Ideal"
5. O componente só renderiza se houver pelo menos 1 simulado completo

### Mapeamento phase → split_name

```text
Phase 0  → "Running 1"    Phase 1  → "Ski Erg"
Phase 2  → "Running 2"    Phase 3  → "Sled Push"
Phase 4  → "Running 3"    Phase 5  → "Sled Pull"
Phase 6  → "Running 4"    Phase 7  → "Burpee Broad Jump"
Phase 8  → "Running 5"    Phase 9  → "Rowing"
Phase 10 → "Running 6"    Phase 11 → "Farmers Carry"
Phase 12 → "Running 7"    Phase 13 → "Sandbag Lunges"
Phase 14 → "Running 8"    Phase 15 → "Wall Balls"
+ Roxzone (type === 'roxzone')
```

Esses nomes já são reconhecidos pelo `resolveSplitKey` existente — zero mudança na lógica do TargetSplitsTable.

### Nenhuma mudança em
- `TargetSplitsTable.tsx` — reutilizado sem alteração
- `evolutionUtils.ts` — aliases já cobrem os nomes
- Lógica de simulação, comparação ou histórico

