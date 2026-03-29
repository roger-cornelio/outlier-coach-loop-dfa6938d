

## Plano: Corrigir exclusão de exercícios aprovados (RLS bloqueando DELETE)

### Causa raiz

A tabela `exercise_suggestions` não tem política RLS de DELETE para admins. Só tem INSERT, SELECT e UPDATE. Quando o admin clica "Excluir", o Supabase silenciosamente retorna 0 linhas deletadas (sem erro), mas nada é removido.

A tabela `global_exercises` já tem `FOR ALL` admin policy, então o delete funciona lá. O problema é só em `exercise_suggestions`.

### Correção

**1. Migration SQL** — adicionar política de DELETE para admins na tabela `exercise_suggestions`:

```sql
CREATE POLICY "Admins can delete suggestions"
  ON public.exercise_suggestions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
```

**2. Código** — nenhuma mudança necessária no `ExerciseSuggestionsAdmin.tsx`. A lógica de `handleDeleteApproved` já está correta, só precisa da permissão no banco.

### Resultado

- Clicar "Excluir" vai remover da tabela `exercise_suggestions` E da `global_exercises`
- A lista atualiza automaticamente após exclusão (já chama `fetchSuggestions()`)

