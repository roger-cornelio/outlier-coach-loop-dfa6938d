

# Bloco "Jornada Outlier" -- Abaixo do Status Competitivo

## O que sera criado

Um novo bloco visual entre o **Status Competitivo** e o **Principal Limitador**, mostrando:

1. Barra de progresso com porcentagem rumo ao proximo nivel (ex: PRO -> ELITE 78%)
2. Ultimo marco atingido (nivel atual e dados de benchmark)
3. Lista de requisitos faltantes para o proximo nivel (derivados das regras do banco)

## Fonte dos dados

Todos os dados vem do backend, sem mocks:

- **Hook `useJourneyProgress`** (ja existe): consulta as tabelas `status_level_rules` e `status_jump_rules`, calcula `progressToTarget`, `currentLevelLabel`, `targetLevelLabel`, `targetLevel.benchmarksCompleted`, `targetLevel.benchmarksRequired`, `targetLevel.trainingSessions`, `targetLevel.trainingRequired`, etc.
- **Hook `useAthleteStatus`** (ja em uso): fornece `status` atual e `outlierScore`
- **Scores via props**: os `scores` (de `hyrox_metric_scores`) sao usados para identificar quais metricas precisam melhorar

## Detalhes tecnicos

### Arquivo alterado: `src/components/DiagnosticRadarBlock.tsx`

1. **Importar** `useJourneyProgress` no topo do componente
2. **Chamar o hook** dentro do componente, ao lado dos hooks ja existentes
3. **Inserir novo bloco JSX** entre a linha 277 (fim do Bloco 2 -- Status Competitivo) e a linha 283 (inicio do Bloco 3 -- Principal Limitador)

### Conteudo do bloco

```text
+--------------------------------------------------+
| JORNADA OUTLIER                                   |
| {currentLabel} -> {targetLabel}                   |
| [========████████░░░░] 78%                        |
|                                                   |
| Ultimo Marco Atingido                             |
| Voce subiu de X para Y                            |
| +12% melhoria no tempo total                      |
|                                                   |
| Para chegar em {targetLabel} faltam:              |
| - Melhorar {worstMetric} para nota A              |
| - Completar {N} benchmarks (tem {M})              |
+--------------------------------------------------+
```

### Logica de derivacao

- **Barra de progresso**: `journey.progressToTarget` (0-100, ja calculado pelo hook)
- **Labels**: `journey.currentLevelLabel` e `journey.targetLevelLabel`
- **Requisitos faltantes**: derivados de `journey.targetLevel`:
  - Benchmarks: `benchmarksRequired - benchmarksCompleted`
  - Treinos: `trainingRequired - trainingSessions`
  - Prova oficial: `officialRaceRequired && !hasOfficialRace`
- **Metricas a melhorar**: as 2 piores metricas dos `scores` (percentil mais baixo), ja calculadas no componente como `affectedStations`
- **Cap**: se `journey.isCapped`, exibe aviso de que progresso esta travado sem prova oficial
- **Estado ELITE**: se `journey.isAtTop`, exibe estado de manutencao ("Voce esta no topo")

### Estilo visual

- Mesmo padrao dos demais blocos (`motion.div` com `card-elevated`)
- Icone de fogo (Flame) no header
- Barra de progresso com gradiente (usando classes Tailwind existentes)
- Delay de animacao `0.075` (entre 0.05 do Status e 0.1 do Limitador)
- Sem estado colapsavel -- sempre visivel

### Nenhuma outra alteracao

- Layout, copy e estilos dos demais blocos permanecem identicos
- Nenhum hook novo criado
- Nenhuma tabela nova
- Nenhuma outra pagina modificada
