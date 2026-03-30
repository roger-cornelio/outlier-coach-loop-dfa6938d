

## Plano: Botão "Dividir em 2 sessões" no editor do coach

### Como funciona

No header de cada dia (AccordionTrigger), ao lado do toggle de "Descanso", adicionar um botão/ícone que divide aquele dia em duas sessões. O dia original vira "Sessão 1" (mantém todos os blocos) e uma "Sessão 2" vazia é criada logo abaixo. O coach pode então mover blocos entre sessões ou adicionar novos.

Se o dia já tem 2 sessões, o botão muda para "Unir sessões" (merge de volta).

### Alterações

**1. `src/components/TextModelImporter.tsx`**

- **Agrupar dias por nome** na renderização do edit mode: detectar quando dois entries consecutivos no `parseResult.days` têm o mesmo `day` (já indica sessão dupla)
- **Botão "Dividir"** no AccordionTrigger de cada dia (ao lado do toggle Descanso):
  - Ao clicar: duplica o entry no `parseResult.days` e no `effectiveDays` com `session: 1` no original e `session: 2` no novo (vazio)
  - Atualiza `parseResult` e `editedDays` via `updateParseResult` + `updateEdited`
- **Botão "Unir"** quando o dia já tem 2 sessões: merge os blocos de volta em um só entry
- **Label visual**: quando um dia tem 2 sessões, mostrar "Sessão 1" e "Sessão 2" no título do AccordionItem
- **SessionLabel editável**: campo de texto pequeno (placeholder "ex: Manhã, 18:00") que aparece só em dias com 2 sessões

**2. Nova função `splitDayIntoSessions`**
- Recebe `dayIndex`, insere novo entry após o dia atual
- Atribui `session: 1` ao existente e `session: 2` ao novo
- O novo entry tem `blocks: []` (coach adiciona via editor)

**3. Nova função `mergeDaySessions`**
- Recebe `dayIndex`, encontra o par de sessões do mesmo dia
- Concatena blocos em um só entry, remove `session` field

### UX
- Ícone: `Copy` ou `Split` com tooltip "Dividir em 2 sessões"
- Dias com sessão dupla mostram sub-header colorido "Sessão 1" / "Sessão 2" dentro do accordion
- Campo de label opcional aparece inline no sub-header

