

## Plano: Expandir layout desktop das abas Visao Geral e Programacoes

### Problema
As abas "Visao Geral" e "Programacoes" usam layout compacto (gaps pequenos, alturas fixas, listas empilhadas) que nao aproveita a largura disponivel em desktop. A edicao e visualizacao ficam apertadas.

### Alteracoes

#### 1) CoachOverviewTab (`src/components/CoachOverviewTab.tsx`)

- **KPI Cards**: aumentar gap no desktop (`gap-3` para `gap-3 lg:gap-6`) e padding interno (`sm:p-4` para `lg:p-6`)
- **KPI Card content**: textos e icones maiores em desktop (`lg:text-4xl` para o numero, `lg:w-5 lg:h-5` para icone)
- **Lista de atletas**: aumentar `max-h` no desktop (`max-h-[calc(100vh-380px)]` para `lg:max-h-[calc(100vh-320px)]`)
- **Athlete Row**: padding e gaps maiores em desktop (`lg:px-6 lg:py-4 lg:gap-4`)
- **Column headers**: gap maior no desktop
- **Adherence bar**: mais larga em desktop (`w-20` para `lg:w-32`)

#### 2) CoachProgramsTab (`src/components/CoachProgramsTab.tsx`)

- **Summary grid**: gap maior (`gap-3` para `gap-3 lg:gap-6`), padding maior nos cards de resumo (`lg:p-6`)
- **ScrollArea**: remover `max-h-[500px]` fixo, usar `max-h-[calc(100vh-400px)]` para aproveitar a tela
- **Workout cards na lista**: em desktop, usar layout com mais espaco horizontal (`lg:p-4 lg:gap-4`)
- **WorkoutDetailModal**: expandir de `max-w-2xl` para `max-w-4xl` em desktop para mostrar blocos lado a lado

#### 3) Nao alterar
- Nenhuma logica, hook, integracao ou fluxo
- Nenhuma cor, icone ou texto
- Layout mobile permanece intacto (todas as mudancas usam prefixo `lg:`)

### Arquivos a alterar
- `src/components/CoachOverviewTab.tsx` — gaps, paddings, alturas responsivos
- `src/components/CoachProgramsTab.tsx` — gaps, ScrollArea height, modal width

