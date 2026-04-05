

## Plano: Gabarito de métricas editável por linha no modo edição

### Ideia
Abaixo de cada linha de exercício no editor (modo edição), mostrar uma barra compacta com os badges semânticos extraídos (reps, carga, duração, intensidade, cadência, distância). O coach vê exatamente o que o parser entendeu e pode **clicar para corrigir** qualquer valor errado.

### UI

```text
┌──────────────────────────────────────────────────────────┐
│ 5 min corrida 07:15–05:36 Z1                             │  ← linha normal
│ ┌──────────────────────────────────────────────────────┐ │
│ │ 🟡 5 reps  🔵 5 min  🟣 07:15–05:36  🔴 Z1         │ │  ← gabarito (badges)
│ │         [editar]                                     │ │  ← clicável
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

Cada badge usa as cores já definidas em `SEMANTIC_COLORS`:
- **Reps** (amber) — repetições, calorias
- **Carga** (vermelho) — kg, lb, %
- **Duração** (azul) — min, seg, MM:SS
- **Intensidade** (vermelho escuro) — Z1-Z5, PSE, RPE, Max
- **Cadência** (roxo) — pace, rpm, km/h
- **Distância** (verde) — m, km

### Comportamento
1. **Gabarito aparece SOMENTE no modo edição** (nunca no preview nem para atleta)
2. Cada badge é clicável → abre um **popover inline** com:
   - Campo de texto para corrigir o valor
   - Dropdown para mudar o tipo (ex: "duração" → "cadência")
   - Botão excluir (remove métrica)
3. Botão "+ Métrica" no final da barra para adicionar métrica que o parser não pegou
4. Correções são salvas como **overrides** no objeto da linha (não altera rawText)
5. Override fica persistido no draft via `editedDays`

### Implementação

**1. Novo componente: `src/components/MetricsGabarito.tsx`**
- Recebe: `line: string`, `overrides?: SemanticOverride[]`, `onChange: (overrides) => void`
- Extrai segmentos via `extractLineSemantics(line)`
- Mescla com overrides (override tem prioridade)
- Renderiza barra de badges clicáveis com popover de edição

**2. Tipo `SemanticOverride` em `src/types/outlier.ts`**
```typescript
interface SemanticOverride {
  index: number;        // posição do segmento
  type: SemanticType;   // tipo corrigido
  text: string;         // valor corrigido
  isAdded?: boolean;    // métrica adicionada manualmente
  isRemoved?: boolean;  // métrica removida
}
```

**3. Integrar no `TextModelImporter.tsx`**
- Abaixo de cada `<SemanticExerciseLine>` no modo edição, renderizar `<MetricsGabarito>`
- Toggle de visibilidade (coach pode esconder/mostrar o gabarito por bloco)

**4. Propagar overrides para cálculos**
- `computeBlockMetrics` e `buildSemanticSummary` consultam overrides antes dos segmentos brutos
- Garante que tempo/kcal e prompts de IA usem os valores corrigidos

### Arquivos alterados
- `src/components/MetricsGabarito.tsx` (novo)
- `src/types/outlier.ts` — tipo SemanticOverride
- `src/components/TextModelImporter.tsx` — integrar gabarito no modo edição
- `src/utils/lineSemanticExtractor.ts` — função `mergeOverrides()` 
- `src/utils/computeBlockKcalFromParsed.ts` — consultar overrides
- `src/utils/workoutSemanticSummary.ts` — consultar overrides

### Resultado
- Coach vê exatamente o que o parser detectou em cada linha
- Pode corrigir tipo e valor de qualquer métrica com 1 clique
- Correções propagam para cálculos de tempo, calorias e prompts de IA
- Zero impacto no preview e na visão do atleta

