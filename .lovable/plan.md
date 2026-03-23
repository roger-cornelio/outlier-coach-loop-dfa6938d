

## Plano: Registro inline por bloco + Feedback final com IA (IMPLEMENTADO)

### O que mudou

1. **WorkoutExecution.tsx** — Registro inline por bloco:
   - FOR TIME/RFT/Chipper → pede tempo (min:seg) com estimativa como referência
   - AMRAP → pede rounds completados com estimativa de rounds esperados (~X rounds)
   - EMOM/Força → só confirmação de conclusão
   - Aquecimento/Core/Notas/Tabata → marca automático, sem perguntas
   - Feedback local instantâneo comparando resultado vs estimado
   - Botão mudou de "REGISTRAR RESULTADO" para "FINALIZAR TREINO"

2. **Detecção de formato corrigida** — `detectBlockFormat` agora verifica:
   - `structureDescription` (prioridade 1)
   - Título do bloco (prioridade 2) — ex: "15' AMRAP"
   - Markers `__STRUCT:` inline nas exerciseLines (prioridade 3)
   - Tipo do bloco como fallback (prioridade 4)

3. **Estimativa de rounds para AMRAP** — Nova função `estimateExpectedRounds`:
   - Usa `estimateWorkoutTime` para calcular tempo de 1 round
   - Divide tempo total do AMRAP pelo tempo de 1 round = rounds esperados
   - Exibido como referência no painel inline ("Esperado: ~X rounds")
   - Feedback compara: "5 rounds (esperado: ~4) — acima do esperado 💪"

4. **PerformanceFeedback.tsx** — Feedback final com IA:
   - Recebe todos os resultados dos blocos da sessão
   - Mostra resumo visual com comparação tempo real vs estimado
   - Gera feedback via IA no tom do coach (IRON/PULSE/SPARK)

5. **generate-performance-feedback edge function** — Multi-block:
   - Aceita `sessionBlocks[]` com dados de todos os blocos
   - Monta contexto completo para a IA gerar comentário da sessão
   - Backward-compatible com payload legado

6. **outlierStore.ts** — `sessionBlockResults`:
   - Campo temporário para armazenar resultados inline durante execução
   - Inclui `estimatedRounds` para AMRAP
   - Não persiste no localStorage
