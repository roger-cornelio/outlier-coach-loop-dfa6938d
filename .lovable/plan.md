

## Plano: Remover card "3 · Open · Pro · Elite" das métricas

### Mudança

**Arquivo:** `src/pages/Landing.tsx` — linhas 214-218

Remover o 4º item do array de métricas (`{ value: 3, suffix: '', label: 'Open · Pro · Elite' }`) e mudar o grid de `grid-cols-2 md:grid-cols-4` para `grid-cols-1 md:grid-cols-3` para acomodar 3 cards centralizados.

### Arquivo alterado

1. **`src/pages/Landing.tsx`** — Remover métrica e ajustar grid

