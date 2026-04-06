

## Plano: Drag & Drop de blocos no editor do coach

### Problema
Hoje os blocos dentro de um dia/sessão são fixos — não há como reordenar, mover entre dias ou entre sessões.

### Solução
Usar a biblioteca **@dnd-kit** (leve, acessível, bem mantida) para permitir arrastar blocos dentro do mesmo dia e entre dias/sessões diferentes.

### UI

```text
┌─ SEGUNDA ──────────────────────────────┐
│  ⠿ Aquecimento         [≡ drag handle] │  ← arrastar para reordenar
│  ⠿ WOD Principal       [≡ drag handle] │
│  ⠿ Core                [≡ drag handle] │
└─────────────────────────────────────────┘

┌─ TERÇA ────────────────────────────────┐
│  ⠿ Corrida             [≡ drag handle] │  ← pode soltar bloco aqui
│  ⠿ Força               [≡ drag handle] │
└─────────────────────────────────────────┘
```

- Ícone `GripVertical` (já importado) como handle de arraste
- Ao arrastar entre dias, o bloco é removido do dia de origem e inserido no destino
- Feedback visual: placeholder com borda tracejada no ponto de destino

### Implementação

**1. Instalar @dnd-kit**
- `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

**2. Criar componente wrapper `src/components/DraggableBlock.tsx`**
- Wrapper com `useSortable` do dnd-kit
- Recebe children e renderiza com handle + transform styles
- Cada bloco tem ID composto: `day-{dayIndex}-block-{blockIndex}`

**3. Editar `src/components/TextModelImporter.tsx`**
- Envolver a lista de dias com `DndContext` + `DragOverlay`
- Cada dia é um `SortableContext` (droppable zone)
- O `blocks.map()` (linha ~2034) renderiza cada bloco dentro de `<DraggableBlock>`
- Handler `onDragEnd`: detecta origem e destino, atualiza o array `parsedDays` movendo o bloco
- Se origem e destino são o mesmo dia: reordenar array de blocks
- Se são dias diferentes: splice do origem, splice no destino
- O `GripVertical` já existe no código — será reutilizado como handle

**4. Lógica de move (`handleBlockMove`)**
- Extrair `dayIndex` e `blockIndex` do ID composto
- Atualizar estado `parsedDays` via `setParsedDays` (ou equivalente no estado atual)
- Recalcular métricas do dia afetado

### Arquivos
- **Instalar**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- **Criar**: `src/components/DraggableBlock.tsx`
- **Editar**: `src/components/TextModelImporter.tsx` — DndContext + SortableContext + handler

### Resultado
- Coach arrasta blocos para reordenar dentro do dia
- Coach arrasta blocos entre dias/sessões diferentes
- Métricas de tempo e calorias recalculam automaticamente

