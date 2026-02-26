
# Corrigir alinhamento da régua de progresso OPEN-PRO-ELITE

## Problema
A barra de progresso ("filled track") no componente `LevelProgress` nao alcanca o no PRO mesmo quando o atleta ja e PRO por prova oficial.

**Causa raiz:** Desalinhamento entre posicao visual dos nos e calculo do preenchimento.

- Os nos sao renderizados com `justify-between`, ficando em **0%, 50%, 100%** do track
- O calculo `continuousPosition = (currentLevelIndex + overallProgress) / levelRules.length` produz **33%** para PRO (index 1, length 3)
- Deveria produzir **50%** para alinhar com o no PRO

## Solucao

### Arquivo: `src/hooks/useJourneyProgress.ts`

Alterar a formula de `continuousPosition` (linha 322) de:

```
(currentLevelIndex + overallProgress) / levelRules.length
```

Para:

```
(currentLevelIndex + overallProgress) / (levelRules.length - 1)
```

Isso mapeia corretamente:
- OPEN (index 0) com 0% progresso = **0%** (alinha com no OPEN)
- PRO (index 1) com 0% progresso = **50%** (alinha com no PRO)  
- ELITE (index 2) com 0% progresso = **100%** (alinha com no ELITE)

E para progresso parcial dentro de um nivel:
- OPEN com 50% progresso = **25%** (metade do caminho OPEN-PRO)
- PRO com 50% progresso = **75%** (metade do caminho PRO-ELITE)

### Ajuste complementar

Garantir que `fillPercentage` tenha cap em 100 no `LevelProgress.tsx` (ja existe `Math.max(2, rawFill)` mas precisamos confirmar o teto).

## Arquivos alterados
1. `src/hooks/useJourneyProgress.ts` — corrigir formula `continuousPosition`

## O que NAO muda
- Logica de jornada, categoria, requisitos
- Visual dos nos, cards, animacoes
- Nenhum outro componente
