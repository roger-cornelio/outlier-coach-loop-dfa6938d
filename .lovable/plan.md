

# Barras de Progresso de Benchmarks e Treinos dentro da Jornada Outlier

## Objetivo

Adicionar dois mini indicadores visuais de progresso (benchmarks completados e sessoes de treino) dentro do bloco **Jornada Outlier**, logo abaixo da barra de progresso principal. Isso cria engajamento ao mostrar ao atleta exatamente onde ele esta em cada requisito, incentivando-o a voltar ao app para completar mais benchmarks e treinos.

## O que muda visualmente

```text
+--------------------------------------------------+
| JORNADA OUTLIER          PRO -> ELITE             |
| Progresso geral          ████████░░  78%          |
|                                                   |
| Benchmarks    3/5        ██████░░░░               |
| Treinos      28/36       █████████░               |
|                                                   |
| Ultimo Marco Atingido                             |
| Nivel atual: HYROX PRO                            |
|                                                   |
| Para chegar em ELITE faltam:                      |
| ...                                               |
+--------------------------------------------------+
```

Duas mini barras de progresso com label, contagem (ex: "3/5") e barra visual, posicionadas logo apos a barra principal e antes do "Ultimo Marco".

## Fonte dos dados

Tudo ja existe no hook `useJourneyProgress` via `targetLevel`:
- `targetLevel.benchmarksCompleted` e `targetLevel.benchmarksRequired`
- `targetLevel.trainingSessions` e `targetLevel.trainingRequired`

Nenhuma query nova ou tabela nova necessaria.

## Detalhes tecnicos

### Arquivo: `src/components/DiagnosticRadarBlock.tsx`

Inserir um novo bloco JSX entre a barra de progresso (linha 356) e o "Ultimo Marco" (linha 358), contendo:

1. **Mini barra de Benchmarks**
   - Label "Benchmarks" a esquerda
   - Contagem "{completed}/{required}" a direita
   - Barra fina (h-1.5) com gradiente azul (`from-blue-500 to-cyan-400`)
   - Largura animada com `motion.div`

2. **Mini barra de Treinos**
   - Label "Treinos" a esquerda
   - Contagem "{sessions}/{required}" a direita
   - Barra fina (h-1.5) com gradiente verde (`from-emerald-500 to-green-400`)
   - Largura animada com `motion.div`

### Logica

```text
benchmarkPercent = min(100, (benchmarksCompleted / benchmarksRequired) * 100)
trainingPercent  = min(100, (trainingSessions / trainingRequired) * 100)
```

Se `benchmarksRequired` ou `trainingRequired` for 0, a barra mostra 100% (requisito ja atingido).

### Estilo

- Barras com altura `h-1.5` (mais finas que a principal de `h-2.5`)
- Espacamento `space-y-2` entre as duas mini barras
- Labels em `text-[10px]` para manter hierarquia visual
- Contagem em `font-mono text-[10px]` para alinhamento numerico
- Container com `mb-3` para separar do bloco "Ultimo Marco"
- Animacao de largura com delay escalonado (0.5s e 0.7s)

### Nenhuma outra alteracao

- Nenhum hook novo
- Nenhuma tabela nova
- Nenhum outro componente alterado
- Bloco ELITE (isAtTop) permanece inalterado
