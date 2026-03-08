

## Plano: Card de Projeção de Evolução com Training Age

### O que será feito

Criar uma função utilitária `calculateEvolutionTimeframe` e um novo componente visual `EvolutionProjectionCard` que calcula quantos meses o atleta precisa para eliminar o gap total de melhoria, baseado no nível atual (Training Age).

### 1. Nova função utilitária

**Arquivo:** `src/utils/evolutionTimeframe.ts`

```typescript
calculateEvolutionTimeframe(currentFinishTimeSeconds, gapSecondsToImprove)
```

Tiers:
- **> 5400s (Novato):** 90 seg/mês
- **4500–5400s (Intermediário):** 40 seg/mês
- **3900–4500s (Avançado):** 15 seg/mês
- **< 3900s (Elite):** 4 seg/mês

Retorna: `{ months, tierLabel, ratePerMonth, gapFormatted }`

### 2. Novo componente visual

**Arquivo:** `src/components/diagnostico/EvolutionProjectionCard.tsx`

- Recebe `finishTime` (string HH:MM:SS) e `diagnosticos` (array de melhorias)
- Converte finish_time para segundos, soma `improvement_value` total como gap
- Chama `calculateEvolutionTimeframe`
- Exibe um card com:
  - Ícone 🎯 + título "Projeção de Evolução"
  - Barra de progresso visual (Progress component)
  - Texto gamificado: "A ciência do esporte projeta que a eliminação deste gap de X minutos exigirá um ciclo de treinamento contínuo de aproximadamente N meses"
  - Badge com tier do atleta (Novato/Intermediário/Avançado/Elite)
  - Taxa de ganho mensal exibida

### 3. Integração no Dashboard

**Arquivo:** `src/components/RoxCoachDashboard.tsx`

- Renderizar `EvolutionProjectionCard` logo após o `ParecerPremium`, antes do toggle de análise completa
- Props: `finishTime={selectedResumo.finish_time}` e `diagnosticos={diagnosticos}`

### Detalhes técnicos

- O gap total vem do `totalDiff` (soma de `improvement_value` de todos os diagnosticos)
- O finish_time é convertido de "HH:MM:SS" para segundos usando `timeToSeconds` já existente
- A barra de progresso mostra visualmente quanto do gap já seria eliminado em X meses
- Se não houver gap (totalDiff = 0) ou não houver finish_time, o card não renderiza

