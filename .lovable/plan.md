## Plano Consolidado Final: Parser IA com Gatekeeper Rigoroso

### Status: ✅ FASE 1 IMPLEMENTADA

### O que foi implementado:

1. ✅ **Migração SQL**: `slug` (unique) + `aliases` (text[]) em `movement_patterns` e `global_exercises` com índices GIN
2. ✅ **Migração SQL**: tabela `intensity_rules` com RLS + seed (PSE 6-10, Zonas 1-5)
3. ✅ **Data seed**: Slugs e aliases populados em todos os 17 movement_patterns e 43 global_exercises
4. ✅ **Tipos** (`src/types/outlier.ts`): `ParsedExercise`, `ComputedBlockMetrics`, campos `parsedExercises`, `computedMetrics`, `parseStatus`, `parsedAt` em `WorkoutBlock`
5. ✅ **Edge Function** `parse-workout-blocks`: Gemini 2.5 Flash via Lovable AI Gateway com dicionário dinâmico, tool calling para structured output, few-shot examples, fallback biomecânico, regra anti-alucinação
6. ✅ **Hook** `useCoachWorkouts.ts`: Save síncrono bloqueante com Gatekeeper, diferenciação cenário A (parse_failure) vs B (infra_failure), preservação parcial de blocos, `forceSaveWorkout` para bypass consciente
7. ✅ **Modal Gatekeeper** (`WorkoutParseValidationModal.tsx`): Modal laranja (culpa coach) vs vermelho (culpa infra), listagem de blocos com falha, botões "Corrigir texto" e "Forçar salvamento sem cálculos"
8. ✅ **UI Atleta** (`WeeklyTrainingView.tsx`): Ícone "i" com tooltip explicativo para blocos sem métricas (parseStatus === 'bypassed' ou 'failed')

### Próximos passos (Fase 2 - quando solicitado):

- Integrar o `WorkoutParseValidationModal` no fluxo do `TextModelImporter` / editor do coach
- Criar `computeBlockKcalFromParsed.ts` para cálculos de kcal a partir dos `parsedExercises` + `movement_patterns`
- Consumir `parsedExercises` na `WeeklyTrainingView` para exibir kcal/tempo reais em vez dos estimados
- Testar end-to-end o fluxo completo coach→save→gatekeeper→atleta
