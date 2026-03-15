

## Correção: Periodização OUTLIER deve usar mesma fonte que Prioridades de Treino

### Problema
O bloco "Periodização OUTLIER" usa `affectedStations` (baseado em `scores` brutos com percentil < 50), enquanto "Prioridades de Treino" usa `worstStations` (baseado em `diagMelhorias` + validação cruzada com IA). São fontes diferentes, gerando listas divergentes.

### Solução
Alterar o `trainingFocus` para derivar dos `worstStations` (filtrados por stars < 5) em vez de `affectedStations`. Assim ambos os blocos refletirão exatamente os mesmos gargalos.

**Arquivo:** `src/components/DiagnosticRadarBlock.tsx`

**Mudança:** No `useMemo` do `trainingFocus` (~linha 2103), trocar a referência de `affectedStations` para `worstStations.filter(s => s.stars.count < 5).slice(0, 3)`, usando `s.label` para os nomes.

