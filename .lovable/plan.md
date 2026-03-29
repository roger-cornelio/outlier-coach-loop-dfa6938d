

## Plano: Remover marcação manual de bloco principal + destravar preview

### Problema
A marcação manual de "WOD Principal" (estrela) ainda existe em 3 lugares e bloqueia o avanço para preview/salvar quando não marcada. O sistema de prioridade automática já existe e torna isso redundante.

### Alterações

**1. `src/components/TextModelImporter.tsx`**
- Remover função `toggleMainWod` (~linha 965-982)
- Remover botão estrela e tooltip "Marcar como WOD principal" (~linhas 1951-1968)
- Remover estilo condicional `block.isMainWod` no container do bloco (~linhas 1941-1945) — usar apenas estilo de validação de categoria

**2. `src/components/CoachSpreadsheetTab.tsx`**
- Remover `mainWodValidation` useMemo (~linhas 190-210)
- Remover `mainWodValidation.isValid` da condição `canSaveOrPublish` (~linha 217) — manter apenas `selectedWeek + parsedWorkouts.length > 0`
- Remover função `toggleMainWod` (~linha 231)
- Remover bloco de erro visual "WOD Principal faltando" (~linhas 700-715)
- Remover mensagem "Defina WOD Principal" no botão desabilitado (~linha 787-788)

**3. `src/utils/structuredTextParser.ts`**
- Remover alerta "Nenhum WOD principal definido" (~linhas 3274-3281)

**4. `src/utils/workoutValidation.ts`**
- Remover checagem `daysWithoutMain` em `validateWorkoutForPublish` (~linhas 141-155) — manter apenas validação de categoria

**5. `src/hooks/useCoachDraft.ts`**
- Já não valida `isMainWod` no `canSave` — sem mudança necessária

### O que NÃO muda
- `identifyMainBlock()` continua funcionando para calcular automaticamente o bloco principal (badge visual + prioridade de corte)
- `isMainWod` no tipo `ParsedBlock` permanece no schema por compatibilidade, mas nunca é `true` manualmente
- Badge "WOD Principal" no `TextModelImporter` preview e `WeeklyTrainingView` continua aparecendo (calculado automaticamente)

### Resultado
- Coach não precisa mais marcar estrela
- Único requisito para avançar: todos os blocos categorizados
- Prioridade calculada automaticamente por peso de categoria + duração

