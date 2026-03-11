

## Plan: Simplify filter chips

Looking at the `EventSearchPanel.tsx`, there are two filter rows:
1. **Tipo**: Todas, Oficial HYROX, Paralela, Simulado
2. **Região**: Todos, Brasil, Internacional

The user wants to remove:
- The "Todas" chip from the first row (redundant with "Todos" in the region row)
- The "Simulado" chip

### Changes

**`src/components/EventSearchPanel.tsx`**:
- Remove `'TODAS'` and `'SIMULADO'` from the tipo_evento filter chips array, keeping only `['OFICIAL', 'PARALELA']`
- Default `tipoEvento` state to `'TODAS'` still (meaning no filter), but only show the two specific options as toggleable chips (clicking again deselects back to TODAS)
- Alternatively, simplify: keep the array as `['OFICIAL', 'PARALELA']` with a chip toggle behavior where clicking the active one deselects it (resets to show all)

