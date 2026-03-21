

## Plano: Corrigir Renderização do Treino Semanal no CoachProgramsTab

### Problema
O `CoachProgramsTab.tsx` renderiza `exerciseLines` como texto bruto numa tag `<pre>` (linha 240), sem tratar:
1. **`__STRUCT:Tabata`**, **`__STRUCT:2 rounds`** — aparecem como texto cru em vez de badges visuais
2. **Alertas "Sem hífen"** — mostram warnings de formatação numa tela que deveria ser de visualização

Outras telas (WeeklyTrainingView, WorkoutExecution) já fazem o tratamento correto: verificam o prefixo `__STRUCT:` e renderizam um `StructureBadge`.

### Solução

**Arquivo: `src/components/CoachProgramsTab.tsx`**

1. **Importar `StructureBadge`** de `DSLBlockRenderer`
2. **Substituir o `<pre>` por renderização linha-a-linha** que:
   - Linhas com `__STRUCT:` → renderiza `<StructureBadge>`
   - Demais linhas → renderiza como texto normal
3. **Remover/ocultar alertas de "Sem hífen"** nesta visualização (é tela de consulta, não de edição — os alertas já aparecem no importador)

### Resultado
- `__STRUCT:Tabata` → badge visual "Tabata"
- `__STRUCT:2 rounds` → badge visual "2 Rounds"
- Sem alertas amarelos de formatação nesta tela

### Arquivo modificado
- `src/components/CoachProgramsTab.tsx` — ~15 linhas alteradas

