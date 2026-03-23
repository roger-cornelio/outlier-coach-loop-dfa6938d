

## Plano: Expandir layout da Visão Geral e Feedbacks para tela cheia em desktop

### Problema

As abas "Visão Geral" e "Feedbacks" usam o mesmo container `max-w-[1600px]` do CoachDashboard, mas o conteúdo interno não aproveita a largura disponível. Os KPI cards e a lista virtualizada ficam compactos comparados com as outras abas (Importar, Programações) que naturalmente preenchem mais espaço.

### Alterações

| Arquivo | O que muda |
|---|---|
| `src/components/CoachOverviewTab.tsx` | KPI cards: grid de 3 cols → 4 cols em `lg:` (adicionando card de "Total Atletas"). Lista virtualizada: aumentar `max-h` em desktop. Athlete rows: mais espaçados, barra de adesão mais larga. Column headers mais visíveis em desktop. |
| `src/components/CoachFeedbacksTab.tsx` | Cards de feedback: layout em grid de 2 colunas em `lg:`. Filtro e header com mais espaço. Cards com mais padding e informação visível em desktop. |

### Detalhes

**Visão Geral:**
- KPI grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` — adicionar card "Total Atletas" como 4o card
- KPI cards: texto e ícones maiores em `lg:` (já tem isso parcialmente, reforçar)
- Lista virtualizada: `max-h-[calc(100vh-320px)]` em lg já existe, manter
- Athlete rows: padding `lg:px-8`, barra de adesão `lg:w-40`
- Remover `contain: strict` se existir, manter `contain: layout paint`

**Feedbacks:**
- Grid de cards: `lg:grid-cols-2` para preencher a largura
- Cards maiores com mais espaçamento interno em desktop

