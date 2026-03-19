## Plano: Fonte Única de Verdade — IA Traduz, Motor Calcula

### Status: ✅ IMPLEMENTADO (94.4% coerência no teste E2E)

### Arquivos Modificados
| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/parse-workout-blocks/index.ts` | Prompt atualizado com regras de fonte única, título no payload, few-shot corrigidos |
| `src/hooks/useCoachWorkouts.ts` | Payload envia `block.title` para Edge Function |
| `src/utils/computeBlockKcalFromParsed.ts` | Normalização rounds (sets=1), lógica AMRAP/EMOM com fallback 180s, regex flexível para títulos compostos |

### Resultado do Teste E2E (8 cenários)
- **Rounds**: ✅ sets=1 em todos exercícios
- **AMRAP**: ✅ sets=1, sem durationSeconds
- **EMOM**: ✅ sets=1, sem durationSeconds  
- **Força**: ✅ sets/reps preservados (4x6, 3x10)
- **Tabata**: ✅ sets=8, dur=20
- **Cardio**: ⚠️ IA omitiu sets (null vs 1) — impacto zero no cálculo (default=1)
- **AMRAP título composto**: ✅ "AMRAP 15 - Conditioning" reconhecido
- **Descanso**: ✅ array vazio

### Única divergência (1/18)
Cardio: IA retornou `sets: null` em vez de `sets: 1`. Sem impacto no motor (default é 1).
