

## Radar Chart de 6 Eixos + Accordion

### Componentes

**1. Novo: `src/components/diagnostico/OutlierRadarChart.tsx`**

Radar de 6 eixos usando `recharts`. Recebe `diagnosticos: DiagnosticoMelhoria[]` como prop.

Mapeamento de movements para categorias:
- **Cardio**: média de movements contendo "run" e "rowing"
- **Força**: média de "sled push" e "sled pull"
- **Potência**: "wall balls"
- **Anaeróbica**: média de "ski erg" e "burpee broad jump" (ou "bbj")
- **Core**: média de "sandbag lunges" e "farmers carry"
- **Eficiência**: "roxzone" (fallback: média geral)

Score = `Math.max(0, Math.min(100, 100 - percentage))`.

Design: `ResponsiveContainer` 300px height, `PolarGrid` stroke `#374151`, `PolarAngleAxis` tick fill `#e5e7eb` size 12, `Radar` stroke/fill `#f97316` fillOpacity 0.4, `PolarRadiusAxis` hidden. Subtítulo centralizado acima.

**2. Modificar: `src/components/RoxCoachDashboard.tsx`**

Dentro do bloco `showFullAnalysis && diagnosticos.length > 0`:

```text
Antes:
  DeepAnalysisBlock
  ImprovementTable

Depois:
  OutlierRadarChart          ← novo, sempre visível no topo
  Collapsible "Análise por estação"
    └─ DeepAnalysisBlock     ← mantido intacto
    └─ ImprovementTable      ← mantida intacta
```

Usar `Collapsible` + `CollapsibleTrigger` + `CollapsibleContent` (já importável de `@/components/ui/collapsible`) com chevron animado e título "Análise por estação".

2 arquivos: 1 novo + 1 editado.

