

## Simulados: De Modal para Accordion Inline (Comparação Fácil)

### O que muda
Trocar o `SimulationDetailModal` (Dialog) por cards expansíveis inline usando `Collapsible`. Cada simulado na lista pode ser aberto/fechado independentemente, permitindo abrir vários ao mesmo tempo para comparar lado a lado.

### Implementação

**1. `SimulatorScreen.tsx`**
- Remover estados `selectedSim`, `detailOpen` e o `<SimulationDetailModal />`
- Trocar `simulations.map` de Card clicável → `Collapsible` com toggle
- Estado: `expandedIds: Set<string>` para controlar quais estão abertos (múltiplos simultâneos)
- Header do card: manter layout atual (ícone troféu, divisão, data, tempo) + ChevronDown que rotaciona
- `CollapsibleContent`: renderizar inline os stats (Tempo Total / Roxzone) + tabela de splits (mesmo conteúdo do modal atual)

**2. `SimulationDetailModal.tsx`**
- Manter arquivo mas não será mais usado pelo SimulatorScreen (pode ser removido ou mantido para reuso futuro)

**3. UX**
- Clicar no card expande/colapsa abaixo
- Múltiplos podem ficar abertos ao mesmo tempo → comparação visual direta
- Animação suave via Collapsible + framer-motion
- Zero mudança nos dados ou lógica de fetch

### Arquivos modificados
- `src/components/simulator/SimulatorScreen.tsx`

