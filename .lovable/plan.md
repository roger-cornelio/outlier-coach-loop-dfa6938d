

## Problema Identificado

A meta da Prova Alvo está usando `useTargetTimes`, que retorna um valor **fixo e absoluto** baseado no nível do atleta:

- Atleta **OPEN** → Meta = tempo PRO fixo = **3960s (1h06m00s)**
- Atleta **PRO** → Meta = tempo ELITE fixo = **3960s (1h06m00s)**

Isso ignora completamente o tempo atual do atleta. Um atleta com 1h19m recebe meta de 1h06m (gap de 13 minutos), o que é irreal para um único ciclo.

## Proposta: Meta Proporcional com Training Age

Em vez de usar o tempo fixo do próximo nível, a meta da Prova Alvo deve usar a função `calculateEvolutionTimeframe` já criada para calcular uma **meta realista** baseada em:

1. **Tempo atual do atleta** (ex: 1h19m = 4740s)
2. **Dias até a prova alvo** (ex: 120 dias = ~4 meses)
3. **Taxa de evolução do tier** (Intermediário = 40s/mês)
4. **Meta = tempoAtual - (meses × taxa)**

### Exemplo concreto:
- Tempo atual: 4740s (1h19m) → Tier Intermediário (40s/mês)
- Prova Alvo em 120 dias (~4 meses)
- Ganho projetado: 4 × 40 = 160s
- **Meta realista: 4740 - 160 = 4580s (1h16m20s)**

## Alterações

### 1. Nova função `calculateProvaAlvoTarget` em `src/utils/evolutionTimeframe.ts`

```typescript
calculateProvaAlvoTarget(currentFinishTimeSeconds, daysUntilRace)
```

- Determina o tier do atleta pela tabela de Training Age
- Calcula meses disponíveis (dias / 30)
- Projeta ganho = meses × taxa
- Retorna `{ targetSeconds, projectedGainSeconds, tierLabel }`
- Limita a meta para nunca ser menor que o threshold do próximo nível (não projeta além do realista)

### 2. Atualizar `src/components/Dashboard.tsx`

- Substituir o cálculo de `provaAlvoTargetTime` que hoje usa `useTargetTimes` (valor fixo)
- Usar `calculateProvaAlvoTarget(currentTimeSec, provaAlvoInfo.daysUntil)` para derivar a meta proporcional
- Precisa do `currentTimeSec` (tempo da última prova) — já disponível via `lastRaceResult`

### 3. Manter `useTargetTimes` inalterado

- Continua sendo usado para "Meta PRO" / "Meta ELITE" na grade de diagnóstico (referência fixa do sistema de classificação)
- A Prova Alvo passa a ter sua própria meta proporcional, separada

