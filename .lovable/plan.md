## Motor de Proporção Diagnóstica — Implementado

### Arquivos

1. **`src/utils/diagnosticProportionEngine.ts`** — Fonte única de verdade
   - `STATION_RACE_WEIGHTS`: tabela fixa timeWeight × impactWeight por estação
   - `computeTrainingFocus()`: foco ponderado (0.6×time + 0.4×impact) para UI do diagnóstico
   - `computeStationEmphasis()`: multiplicadores 0.85x–1.15x volume-neutros para adaptação

2. **`src/components/diagnostico/ImprovementTable.tsx`** — Usa `computeTrainingFocus` na coluna "Foco"

3. **`src/components/PublishToAthletesModal.tsx`** — Step "Adaptação" com toggle por atleta
   - Busca `diagnostico_melhoria` dos atletas selecionados
   - Mostra chips coloridos (Wall Balls +15%, SkiErg -10%)
   - Coach liga/desliga adaptação por atleta via Switch
