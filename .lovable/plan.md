

## Plano: Registro inline por bloco + Feedback final com IA (IMPLEMENTADO)

### O que mudou

1. **WorkoutExecution.tsx** — Registro inline por bloco:
   - FOR TIME/RFT/Chipper → pede tempo (min:seg) com estimativa como referência
   - AMRAP → pede rounds/reps completados
   - EMOM/Força → só confirmação de conclusão
   - Aquecimento/Core/Notas/Tabata → marca automático, sem perguntas
   - Feedback local instantâneo comparando resultado vs estimado
   - Botão mudou de "REGISTRAR RESULTADO" para "FINALIZAR TREINO"

2. **PerformanceFeedback.tsx** — Feedback final com IA:
   - Recebe todos os resultados dos blocos da sessão
   - Mostra resumo visual com comparação tempo real vs estimado
   - Gera feedback via IA no tom do coach (IRON/PULSE/SPARK)

3. **generate-performance-feedback edge function** — Multi-block:
   - Aceita `sessionBlocks[]` com dados de todos os blocos
   - Monta contexto completo para a IA gerar comentário da sessão
   - Backward-compatible com payload legado

4. **outlierStore.ts** — `sessionBlockResults`:
   - Campo temporário para armazenar resultados inline durante execução
   - Não persiste no localStorage
