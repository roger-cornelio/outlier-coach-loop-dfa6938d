

## Plano: Corrigir cálculos do motor de energia (5 erros identificados)

### Contexto

A análise comparativa entre os cálculos do motor e os valores de referência revelou 5 problemas no `DEFAULT_PATTERN_DATA` do `computeBlockKcalFromParsed.ts`. Os erros afetam todas as telas (Preview, Programações e Atleta) já que todas usam `computeBlockMetrics` como fonte única.

### Correções

#### 1) Adicionar pattern `mobility` para exercícios leves (Squat to Stand, Pike Lunges)
**Arquivo:** `src/utils/computeBlockKcalFromParsed.ts`

Hoje esses exercícios caem no pattern `squat` (70% massa, 0.5m) → ~5 kcal. Referência: 1-2 kcal.

Adicionar:
```
mobility: { formulaType: 'vertical_work', movedMassPercentage: 0.30, defaultDistanceMeters: 0.2, humanEfficiencyRate: 0.20, defaultSecondsPerRep: 3 }
```

#### 2) Corrigir Farmer Carry — de fricção para MET metabólico
**Arquivo:** `src/utils/computeBlockKcalFromParsed.ts`

Hoje `carry` usa `horizontal_friction` com coeff 0.01 → ~0.2 kcal (irreal). Farmer Carry com carga deveria ser ~5-8 kcal por 20m.

Mudar carry para:
```
carry: { formulaType: 'metabolic', movedMassPercentage: 1.0, defaultDistanceMeters: 25, humanEfficiencyRate: 0.20, defaultSecondsPerRep: 30 }
```
E adicionar `carry` ao `METABOLIC_METS` com MET 6.0.

#### 3) Adicionar pattern `rest` para descanso entre rounds
**Arquivo:** `src/utils/computeBlockKcalFromParsed.ts`

Quando a IA retorna um exercício "rest" com `durationSeconds`, o motor deve contabilizar o tempo sem adicionar kcal.

Adicionar:
```
rest: { formulaType: 'metabolic', movedMassPercentage: 0, defaultDistanceMeters: 0, humanEfficiencyRate: 1.0, defaultSecondsPerRep: 60 }
```
E `rest` ao `METABOLIC_METS` com MET 1.0 (basal, gasto desprezível).

#### 4) Melhorar Broad Jump — aumentar distância vertical efetiva
**Arquivo:** `src/utils/computeBlockKcalFromParsed.ts`

`total_body_plyo` usa `defaultDistanceMeters: 0.3` que subestima Broad Jumps. Aumentar para 0.45m e reduzir eficiência para 0.15 (maior gasto real pela componente horizontal).

```
total_body_plyo: { ..., defaultDistanceMeters: 0.45, humanEfficiencyRate: 0.15, ... }
```

#### 5) Adicionar slug `warmup_movement` como alias de `mobility`
**Arquivo:** `src/utils/computeBlockKcalFromParsed.ts`

Para cobrir classificações da IA que usem esse slug alternativo.

```
warmup_movement: mobility (mesmos valores)
```

### Impacto

- **Exercícios leves**: de ~5 kcal para ~1-2 kcal (alinhado com referência)
- **Farmer Carry**: de ~0.2 kcal para ~5-8 kcal (alinhado com referência)
- **Rest**: tempo contabilizado, kcal ≈ 0
- **Broad Jump**: aumento moderado no gasto estimado
- Todas as telas (Preview, Programações, Atleta) se beneficiam automaticamente

### Arquivo a alterar
- `src/utils/computeBlockKcalFromParsed.ts` — patterns, METs e slugs

### Não alterar
- Nenhuma lógica de rendering, hooks, integrações ou fluxos
- Nenhuma Edge Function ou banco de dados
- Layout mobile/desktop inalterado

