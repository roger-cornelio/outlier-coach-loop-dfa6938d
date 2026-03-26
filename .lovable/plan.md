

## Problema: Contagem de Sessões Divergente

### Causa raiz
- Os **checkmarks dos dias** (SEG, TER, QUA, QUI) usam duas fontes: store Zustand + localStorage (`outlier-benchmark-history`)
- A **Jornada Outlier** usa apenas o store Zustand (`workoutResults`), que é volátil e pode perder dados entre sessões
- Resultado: treinos completados em sessões anteriores aparecem como check no dia, mas não contam na jornada

### Solução
Modificar `useJourneyProgress.ts` para usar a **mesma lógica combinada** do `useWeekWorkoutCompletions` — ler tanto do store quanto do localStorage — garantindo que todas as sessões registradas sejam contabilizadas.

### O que muda

**`src/hooks/useJourneyProgress.ts`**:
1. Importar e ler dados do localStorage (`outlier-benchmark-history`) dentro de `countUniqueTrainingDays`
2. Combinar os dias únicos de ambas as fontes (store + localStorage)
3. Manter o filtro de 12 meses de expiração sobre ambas as fontes

### O que NÃO muda
- O store Zustand continua sendo alimentado normalmente
- Os checkmarks dos dias continuam funcionando como antes
- A lógica de cálculo de progresso (treinos + benchmarks / 2) permanece idêntica
- Nenhum outro hook ou componente é alterado

