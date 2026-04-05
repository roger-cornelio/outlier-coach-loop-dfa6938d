

## Plano: Legenda consultiva de métricas + limpar gabarito inline

### O que muda

**1. Remover gabarito inline dos blocos**
- `src/components/TextModelImporter.tsx`: remover import `MetricsGabarito`, remover states `showGabarito`/`lineOverrides`, remover `<MetricsGabarito>` dos blocos, remover botão toggle "Gabarito visível"
- `src/components/MetricsGabarito.tsx`: **deletar arquivo**
- `src/utils/lineSemanticExtractor.ts`: remover `mergeOverrides` e import de `SemanticOverride` (linhas 219-264)
- `src/types/outlier.ts`: remover `SemanticOverride` e `SemanticOverrideType` (linhas 247-259)

**2. Criar legenda consultiva com cores reais**
- `src/components/MetricsLegend.tsx` (novo): Dialog acessível por botão no toolbar do editor
- Cada item da legenda mostra o **badge real com a cor exata** usada nos blocos + nome + exemplos de formato
- O coach bate o olho na legenda e identifica se a cor de cada trecho no bloco está certa

```text
┌───────────────────────────────────────────┐
│  📖 Legenda de Métricas                   │
│                                           │
│  [5×10]       Repetições   reps, cal      │  ← badge amber
│  [60kg]       Carga        kg, lb, %      │  ← badge vermelho
│  [5min]       Duração      min, seg, MM:SS│  ← badge azul
│  [Z2]         Intensidade  Z1-Z5, PSE, RPE│  ← badge vermelho escuro
│  [pace 5:00]  Cadência     pace, rpm, km/h│  ← badge roxo
│  [400m]       Distância    m, km          │  ← badge verde
│  [(carga Pro)]Carga HYROX  pro, open      │  ← badge laranja
│  [(nota)]     Nota         (texto)        │  ← badge cinza
│                                           │
│              [ Fechar ]                   │
└───────────────────────────────────────────┘
```

Os badges usam exatamente `SEMANTIC_COLORS` de `lineSemanticExtractor.ts` — as mesmas classes CSS aplicadas no `SemanticExerciseLine` dos blocos. Assim o coach compara visualmente: "a cor do trecho no bloco bate com qual item da legenda?"

**3. Botão no toolbar do editor**
- Ícone de paleta/info no toolbar existente do `TextModelImporter`
- Abre o Dialog da legenda

### Arquivos
- **Deletar**: `src/components/MetricsGabarito.tsx`
- **Editar**: `src/components/TextModelImporter.tsx` (limpar inline + botão legenda)
- **Editar**: `src/utils/lineSemanticExtractor.ts` (remover mergeOverrides)
- **Editar**: `src/types/outlier.ts` (remover SemanticOverride)
- **Criar**: `src/components/MetricsLegend.tsx`

