
Objetivo: eliminar o “travamento na versão de programador” atacando os 3 gargalos reais que achei no código atual: spam de logs em hot-path, warning de key duplicada no render e timeout assíncrono incompleto no Gatekeeper.

1) Diagnóstico confirmado no código
- `src/components/StructuredWorkoutEditor.tsx`: há logs dentro de render/map (`[RENDER_BLOCK]`) + `AnimatePresence` com múltiplos filhos sem `key`, e o console já mostra warning de key duplicada.
- `src/utils/fenceValidation.ts`: dezenas de `console.log` não protegidos dentro de loops de parsing/validação (altíssimo custo em textos grandes).
- `src/hooks/useCoachWorkouts.ts`: `AbortController` é criado, mas o `signal` não é usado no `supabase.functions.invoke`; na prática, esse “timeout” pode não interromper chamadas penduradas.
- `src/components/TextModelImporter.tsx`: já melhorou com `useMemo`, mas ainda pode sofrer em textos grandes sem debounce do preview.

2) Correções que vou implementar (ordem de impacto)
- Hot-path logging guard:
  - Criar padrão de logger com flag (`import.meta.env.DEV && VITE_DEBUG_PARSER === 'true'`) e trocar logs de alto volume por no-op fora de debug.
  - Aplicar em: `fenceValidation.ts`, `StructuredWorkoutEditor.tsx`, `CoachSpreadsheetTab.tsx`, `useCoachDraft.ts`, `dslAutoFormat.ts`.
  - Manter `console.error` apenas para falhas reais.
- React reconciliation fix:
  - Adicionar `key` explícita em cada child de `AnimatePresence` no `StructuredWorkoutEditor`.
  - Revisar chaves de listas para fallback composto (`day + block.id + index`) onde houver risco de colisão.
- Timeout robusto no Gatekeeper:
  - Trocar lógica atual por `Promise.race` real em `callParseWorkoutBlocks` (retorno de erro controlado em 15s).
  - Garantir reset de loading em todos os caminhos de cancelamento/erro/retry.
- Alívio de validação no import:
  - Debounce (~300ms) no `previewAutoFormatChanges` para textos longos (ex.: >100 linhas), mantendo resposta imediata em textos curtos.

3) Critérios de aceite (QA)
- Sem warning “Encountered two children with the same key” no console ao usar editor estruturado.
- Clicar em “Validar texto” não congela UI em textos longos (spinner aparece e UI permanece responsiva).
- Em falha de backend, modal abre em até 15s e botão de salvar volta ao estado normal ao fechar/cancelar.
- Sem flood de logs por render/linha quando debug não está explicitamente ativo.

4) Arquivos alvo
- `src/components/StructuredWorkoutEditor.tsx`
- `src/utils/fenceValidation.ts`
- `src/hooks/useCoachWorkouts.ts`
- `src/components/TextModelImporter.tsx`
- `src/components/CoachSpreadsheetTab.tsx`
- `src/hooks/useCoachDraft.ts`
- `src/utils/dslAutoFormat.ts`

5) Risco e compatibilidade
- Risco baixo/médio: mudanças focadas em performance/estabilidade, sem alterar regra de negócio.
- Compatível com o fluxo atual (Coach salva → Gatekeeper → persistência → visualização do atleta); apenas remove travas e pendências silenciosas.
