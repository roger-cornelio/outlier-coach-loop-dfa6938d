

## Alinhar Mapeamento dos Dois Radars

### Problema
Os dois radars (Dashboard e Diagnóstico) usam mapeamentos diferentes para os mesmos 6 eixos, gerando inconsistência visual.

### Solução
Unificar ambos usando o mapeamento agrupado do OutlierRadarChart (que é fisiologicamente mais coerente):

```text
Cardio     → avg(run_avg, row)
Força      → avg(sled_push, sled_pull)
Potência   → wallballs
Anaeróbica → avg(ski, bbj)
Core       → avg(sandbag, farmers)
Eficiência → roxzone
```

### Mudanças

**1. `src/components/DiagnosticRadarBlock.tsx`** — Atualizar `RADAR_AXES` e `radarData`

Trocar a constante `RADAR_AXES` (linhas 71-77) de mapeamento 1:1 para mapeamento agrupado:

```typescript
const RADAR_AXES = [
  { shortName: 'Cardio', name: 'Resistência Cardiovascular', metrics: ['run_avg', 'row'] },
  { shortName: 'Força', name: 'Força & Resistência Muscular', metrics: ['sled_push', 'sled_pull'] },
  { shortName: 'Potência', name: 'Potência & Vigor', metrics: ['wallballs'] },
  { shortName: 'Anaeróbica', name: 'Capacidade Anaeróbica', metrics: ['ski', 'bbj'] },
  { shortName: 'Core', name: 'Core & Estabilidade', metrics: ['sandbag', 'farmers'] },
  { shortName: 'Eficiência', name: 'Coordenação sob Fadiga', metrics: ['roxzone'] },
];
```

Atualizar o `useMemo` de `radarData` (linha 1739-1743) para calcular a média dos percentis agrupados em vez de buscar 1 métrica.

**2. Verificar `mainLimiter` e `affectedStations`** — Esses usam `scores` diretamente (métrica individual), não o radar agrupado, então continuam corretos e intocados.

Resultado: ambos os radars mostrarão exatamente o mesmo perfil fisiológico.

