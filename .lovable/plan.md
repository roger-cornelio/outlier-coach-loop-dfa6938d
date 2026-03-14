## Plano Consolidado Final: Parser IA com Gatekeeper Rigoroso

### Status: ✅ FASE 1 + FASE 2 + FASE 2.5 (BLINDAGEM) IMPLEMENTADAS

---

### Fase 1 (Infraestrutura) ✅

1. ✅ **Migração SQL**: `slug` (unique) + `aliases` (text[]) em `movement_patterns` e `global_exercises` com índices GIN
2. ✅ **Migração SQL**: tabela `intensity_rules` com RLS + seed (PSE 6-10, Zonas 1-5)
3. ✅ **Data seed**: Slugs e aliases populados em 17 movement_patterns e 43 global_exercises
4. ✅ **Tipos** (`src/types/outlier.ts`): `ParsedExercise`, `ComputedBlockMetrics`, campos `parsedExercises`, `computedMetrics`, `parseStatus`, `parsedAt` em `WorkoutBlock`
5. ✅ **Edge Function** `parse-workout-blocks`: Gemini 2.5 Flash via Lovable AI Gateway com dicionário dinâmico, tool calling, few-shot, anti-alucinação

### Fase 2 (Integração) ✅

6. ✅ **Hook** `useCoachWorkouts.ts`: Save síncrono bloqueante + Gatekeeper (cenário A/B) + preservação parcial + `forceSaveWorkout` + `gatekeeperResult` state
7. ✅ **Modal Gatekeeper** (`WorkoutParseValidationModal.tsx`): Modal laranja (coach) vs vermelho (infra), bypass consciente
8. ✅ **Integração** `CoachSpreadsheetTab.tsx`: Modal wired ao fluxo de save, com `pendingGatekeeperSave` para retry/bypass
9. ✅ **Utilitário** `computeBlockKcalFromParsed.ts`: Motor de cálculo de kcal/tempo usando fórmulas biomecânicas (vertical_work, horizontal_friction, metabolic) + multiplicadores de intensidade
10. ✅ **UI Atleta** (`WeeklyTrainingView.tsx`): Prioriza `parsedExercises` para kcal/tempo real, fallback para estimativas legadas, ícone "i" com tooltip para blocos sem métricas

### Fase 2.5 (Blindagem Anti-Freeze) ✅

11. ✅ **Web Worker** (`src/workers/structuredParser.worker.ts`): Parser isolado em thread separada — UI nunca congela
12. ✅ **TextModelImporter.tsx**: Worker com timeout de 8s + `worker.terminate()` + `try/finally` consistente + toast de erro no save falho
13. ✅ **useCoachWorkouts.ts**: Catch mapeia exceções inesperadas para `gatekeeperResult { errorType: 'infra_failure' }` — modal vermelho sempre abre
14. ✅ **CoachSpreadsheetTab.tsx**: `onForceBypass` envolvido em `try/finally` — `isSavingToDb` nunca fica travado
15. ✅ **CORS Edge Function**: Já correto (headers extendidos incluindo `x-supabase-client-*`) — sem alteração necessária

### Arquitetura do Fluxo

```
Coach clica "Validar" → Web Worker (thread separada) → timeout 8s
  ├── Sucesso → Exibe resultado parseado ✅
  └── Timeout/Erro → UI destrava + erro amigável ✅

Coach clica "Salvar" → UI trava (loading) → Edge Function parse-workout-blocks (Gemini 2.5 Flash)
  ├── Sucesso → Salva no banco com parsedExercises enriquecidos ✅
  └── Falha → Modal Gatekeeper
       ├── Cenário A (laranja): "Texto não reconhecido" → Coach corrige ou força bypass
       └── Cenário B (vermelho): "Motor indisponível" → Coach tenta novamente ou força bypass
            └── Bypass → try/finally garante isSavingToDb resetado ✅
```

### Próximos passos opcionais (Fase 3):
- Retry automático em background para blocos bypassed
- Dashboard de qualidade de escrita do coach
- Cache de dicionário na edge function (Deno KV)
- Feedback loop para exercícios não reconhecidos
