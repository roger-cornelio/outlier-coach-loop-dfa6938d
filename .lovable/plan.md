

## Plano: "Resultado Esperado" inteligente — base no simulado quando disponível

### Regra de cálculo

- **Se há último simulado** (`lastSimulationTime` existe): usar o tempo do simulado como base → `calculateProvaAlvoTarget(lastSimulationTime, daysUntil)`
- **Se não há simulado**: usar o tempo da última prova oficial → `calculateProvaAlvoTarget(performanceSnapshot.currentTime, daysUntil)` (como já funciona)

### Mudança em `DiagnosticRadarBlock.tsx`

Nos dois blocos (mobile ~linha 2391 e desktop ~linha 2585), trocar:

```
const projected = calculateProvaAlvoTarget(performanceSnapshot.currentTime, provaAlvo.daysUntil);
```

Por:

```
const baseTime = lastSimulationTime ?? performanceSnapshot.currentTime;
const projected = calculateProvaAlvoTarget(baseTime, provaAlvo.daysUntil);
```

### Indicação visual

Adicionar um texto pequeno abaixo do valor de "Result. Esperado" indicando a base do cálculo:
- `"(base: simulado)"` se usou lastSimulationTime
- `"(base: prova oficial)"` se usou performanceSnapshot.currentTime

### O que não muda
- `calculateProvaAlvoTarget` (mesma função, mesma lógica de taxa/mês)
- Coluna "Últ. Simulado" (continua mostrando o tempo bruto)
- Nenhuma tabela no banco

