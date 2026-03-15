

## Plano: Novo layout do cabeçalho de métricas

### De → Para

| Antes | Depois |
|-------|--------|
| Tempo prova | **Última prova** (mesmo valor) |
| Requisito ELITE (tempo alvo) | **Status Atual: PRO** (exibir tempo requisito PRO) |
| Ganho (diferença para o próximo) | **Próximo Status: ELITE** (exibir tempo requisito ELITE) |
| Evolução | **GAP** (diferença entre requisito atual e próximo status) |

### Layout: 4 colunas

1. **Última prova** — tempo da prova atual (ex: `1h12m20s`)
2. **Status Atual : PRO** — exibe o valor do requisito do nível atual do atleta (ex: requisito PRO)
3. **Próximo Status : ELITE** — exibe o valor do requisito do próximo nível (ex: requisito ELITE)
4. **GAP** — diferença entre o requisito do status atual e o requisito do próximo status

### Lógica

- Para atletas OPEN: Status Atual = OPEN (requisito OPEN), Próximo = PRO (requisito PRO)
- Para atletas PRO: Status Atual = PRO (requisito PRO), Próximo = ELITE (requisito ELITE)
- Para atletas ELITE: Status Atual = ELITE, Próximo = ELITE (GAP = 0 ou "Meta atingida")
- Os tempos dos requisitos vêm de `topPercentData` (metaProSeconds, metaEliteSeconds) e `useTargetTimes`

### Dados necessários

Preciso de acesso a **ambos** os tempos (PRO e ELITE) simultaneamente. Atualmente `eliteTarget` retorna apenas o próximo nível. Vou criar um `useMemo` adicional que calcule os dois valores e o gap entre eles.

### Arquivos alterados

- **`src/components/DiagnosticRadarBlock.tsx`** — reformular o `performanceSnapshot` para ter `currentLabel`, `currentReqValue`, `nextLabel`, `nextReqValue`, `gapValue`; atualizar os 2 grids de métricas (mobile ~2335 e desktop ~2497)

