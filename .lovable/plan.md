

## Plano: Mostrar Apenas a Última Prova no Diagnóstico Gratuito

### O que muda

No `DiagnosticoGratuito.tsx`, a busca já ordena os resultados por `season_id DESC` + `event_index ASC` (mais recente primeiro) — mesma lógica usada internamente no `BenchmarkHistory.tsx` e `ProvasTab.tsx`.

A única mudança é: em vez de mostrar até 5 resultados (`sorted.slice(0, 5)`), mostrar **apenas o primeiro** (`sorted.slice(0, 1)`).

### Arquivo afetado

**`src/pages/DiagnosticoGratuito.tsx`** — linha 135:
- Trocar `sorted.slice(0, 5)` por `sorted.slice(0, 1)`

Isso garante que o atleta vê apenas sua prova mais recente, sem opção de escolher outras. Uma única mudança de uma linha.

