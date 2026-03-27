

## Plano: Régua de Evolução Real — Prova Oficial → Simulados → Meta

### Lógica atual (problema)
A régua usa `gapToNextSec * 2` como range, resultando em **50% fixo** sempre. Não reflete evolução real.

### Nova lógica

**Ponto de partida (0%)**: tempo da última prova oficial (`currentTime` = `validatingCompetition.time_in_seconds`)

**Ponto de chegada (100%)**: meta do próximo nível (`nextReqSec` = meta PRO ou ELITE)

**Posição atual**: último simulado (`lastSimulationTime`) se existir, senão fica em 0%

```text
Prova Oficial (0%)  ────────────── Últ. Simulado (X%) ──────── Meta PRO (100%)
1h19m57s                           1h17m00s                     1h13m36s
```

**Fórmula:**
```
range = officialTime - nextReqSec           // ex: 4797 - 4416 = 381s
improved = officialTime - lastSimulationTime // ex: 4797 - 4620 = 177s
progressPercent = (improved / range) * 100   // ex: 46%
```

### Mudança em `DiagnosticRadarBlock.tsx`

**Arquivo:** `src/components/DiagnosticRadarBlock.tsx` (~linhas 1907-1916)

Substituir o cálculo do `progressPercent`:

```typescript
let progressPercent = 0;
if (isGoalReached) {
  progressPercent = 100;
} else if (currentTime && nextReqSec && gapToNextSec > 0) {
  if (lastSimulationTime && lastSimulationTime < currentTime) {
    // Régua real: quanto o simulado avançou desde a prova oficial
    const totalRange = currentTime - nextReqSec;
    const improved = currentTime - lastSimulationTime;
    progressPercent = Math.min(100, Math.max(0, (improved / totalRange) * 100));
  } else {
    // Sem simulado = ponto de partida (0%)
    progressPercent = 0;
  }
}
```

### Regras
- Sem simulado → barra em **0%** (ponto de partida é a prova oficial)
- Simulado pior que prova oficial → **0%** (não regride)
- Simulado melhor que meta → **100%**
- Simulado entre prova e meta → **proporcional** ao avanço

### O que não muda
- Cálculo de gap, previsão em meses, frase de ação
- Coluna "Últ. Simulado" e "Result. Esperado"
- Nenhuma tabela no banco

