

## Plano: Badge de Intensidade — Vermelho Forte, Visual Único

### Resumo

Criar um novo marcador visual para indicadores de intensidade (PSE, RPE, Zona, FC, Pace, descritivos) com **cor vermelha forte** e visual distinto de rounds (laranja), exercícios (texto normal) e comentários (cinza). Adicionar na documentação DSL e modelo recomendado como marcador opcional.

### O que muda

| Arquivo | Alteração |
|---|---|
| `src/utils/blockDisplayUtils.ts` | Nova constante `INTENSITY_LINE_PREFIX = '__INTENSITY:'`. Nova função `isIntensityOnlyLine()` que detecta linhas 100% de intensidade. No `getBlockDisplayDataFromParsed`, linhas de intensidade pura são marcadas com `__INTENSITY:` em vez de virar exercício. |
| `src/components/DSLBlockRenderer.tsx` | Novo componente `IntensityBadge` — fundo vermelho escuro (`bg-red-600/20 text-red-500 border-red-600/30`), ícone de pulso (`Activity` do lucide), fonte bold. Todos os loops de `exerciseLines` (incluindo `FullBlockRenderer`) verificam `__INTENSITY:` para renderizar o badge. |
| `src/components/CoachProgramsTab.tsx` | No loop de exerciseLines, check para `INTENSITY_LINE_PREFIX` → renderizar `IntensityBadge`. |
| `src/components/TextModelImporter.tsx` | (1) No loop de exerciseLines do preview, check para `INTENSITY_LINE_PREFIX`. (2) Na Sintaxe DSL, adicionar linha: `PSE 8` — intensidade (opcional). |
| `src/components/WeeklyTrainingView.tsx` | No loop de exerciseLines, check para `INTENSITY_LINE_PREFIX` → renderizar `IntensityBadge`. |
| `src/components/StructuredErrorDisplay.tsx` | No modelo recomendado e nos marcadores, adicionar `PSE 8` como marcador opcional de intensidade. |

### Visual do IntensityBadge

```text
┌─────────────────────────┐
│  ❤️‍🔥  PSE 8              │  ← vermelho forte, bold
└─────────────────────────┘
```

- **Cor única para todos os tipos**: `bg-red-600/20 text-red-500 border-red-600/30`
- **Ícone**: `Activity` (pulso/batimento) do lucide-react
- **Formato**: mesmo tamanho do StructureBadge, mas visualmente distinto pelo vermelho

### Detecção de linha de intensidade pura

A função `isIntensityOnlyLine()` verifica se a linha **inteira** é um indicador. Exemplos que viram badge:
- `PSE 8`, `RPE 7`, `Z2`, `Zona 3`, `FC 150`, `Pace 5:00/km`, `(forte)`, `(leve)`

Exemplos que **não** viram badge (contêm exercício):
- `Corrida 5km Z2` → exercício normal
- `Row 2000m Pace 5:00/km` → exercício normal

### Documentação atualizada

**Sintaxe DSL** (TextModelImporter):
```
PSE 8  — intensidade do bloco (opcional: PSE, RPE, Z2, FC, Pace)
```

**Modelo Recomendado** (StructuredErrorDisplay):
```
BLOCO: WOD
**15' AMRAP**
PSE 8
- 10 Wall Ball 9kg
```

**Marcadores**:
```
PSE 8  → intensidade (PSE, RPE, Z2, FC, Pace…) — opcional
```

### Hierarquia visual final

| Token | Cor | Destaque |
|---|---|---|
| DIA | foreground | grande, bold, divisor |
| BLOCO | foreground | card com borda |
| ESTRUTURA | laranja/variado | badge com ícone |
| **INTENSIDADE** | **vermelho forte** | **badge com ícone de pulso** |
| EXERCÍCIO | foreground/80 | texto normal |
| COMENTÁRIO | cinza | bloco lateral com 💬 |

