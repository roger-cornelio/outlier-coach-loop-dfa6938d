

## Plano: Corrigir busca do último simulado — coluna errada + refresh ausente

### Problema 1: Coluna errada
O `useEffect` em `DiagnosticRadarBlock.tsx` (linha ~1809) busca `total_time_seconds` da tabela `simulations`, mas essa coluna **não existe**. A coluna real é `total_time`. Por isso `lastSimulationTime` nunca é preenchido, e a régua + "Últ. Simulado" + "Result. Esperado" ficam sem dados.

### Problema 2: SimulatorScreen não dispara refresh
Em `SimulatorScreen.tsx` (linha ~158), após salvar um simulado (`handleFinishRace`), o componente chama `fetchSimulations()` mas **não** chama `triggerExternalResultsRefresh()`. O painel "Nível Competitivo" só re-busca quando esse refresh key muda.

### Correções

**Arquivo 1: `src/components/DiagnosticRadarBlock.tsx` (~linha 1809)**
- Trocar `.select('total_time_seconds')` por `.select('total_time')`
- Trocar `(data[0] as any).total_time_seconds` por `(data[0] as any).total_time`

**Arquivo 2: `src/components/simulator/SimulatorScreen.tsx` (~linha 156)**
- Importar `triggerExternalResultsRefresh` do `useOutlierStore`
- Chamar `triggerExternalResultsRefresh()` após salvar o simulado em `handleFinishRace`
- Também chamar após deletar um simulado (~linha 122)

### O que não muda
- Lógica de cálculo da régua, projeção
- Nenhuma tabela no banco

