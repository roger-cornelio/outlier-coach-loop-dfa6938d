
Verificação completa do código: **a hipótese de CORS, sozinha, não explica o “Validando...” infinito**.

### O que encontrei
1. **Edge Function `parse-workout-blocks` já está com CORS correto**:
   - Trata `OPTIONS`.
   - Retorna `corsHeaders` em sucessos e erros.
   - Já inclui os headers extras do client (`x-supabase-client-*`), que são importantes no Preview.
2. O travamento em **“Validando...”** acontece no botão de `handleParse` do `TextModelImporter` (parser local), **antes** do Gatekeeper/Edge Function.
3. O timeout atual com `Promise.race + setTimeout(0)` não protege contra bloqueio síncrono do parser (thread única).
4. Sua sugestão de `setIsValidating` / `setIsSavingToDb?.` dentro do `TextModelImporter` não encaixa no estado atual (esses setters não existem ali).

### Plano de correção definitiva
1. **Blindagem real do parser local (raiz do bug)**
   - Extrair `parseStructuredText` para execução em **Web Worker**.
   - No `handleParse`, iniciar worker + timeout (8s).
   - Se exceder timeout: `worker.terminate()`, registrar erro amigável e garantir `setIsParsing(false)`.
   - Isso remove o risco de congelamento da UI por regex/parse síncrono.

2. **Hardening de loading states no fluxo de importação**
   - Em `TextModelImporter`, envolver `handleParse` e `handleSaveAndGoToPrograms` com `try/catch/finally` consistente.
   - `finally` sempre limpa timeout e estados locais de loading (`isParsing` e estado local de submit, se criado).
   - Em falha de save (`onSaveAndGoToPrograms === false`), manter feedback visual explícito (toast + erro contextual).

3. **Gatekeeper/Cenário B garantido em falhas de rede**
   - Em `useCoachWorkouts`, manter mapeamento de falha de rede/timeout para `infra_failure`.
   - Garantir que exceções inesperadas sempre setem `gatekeeperResult` para abrir modal vermelho.

4. **CORS: hardening sem regressão**
   - Não reduzir `Access-Control-Allow-Headers` para a versão curta.
   - Apenas reforçar (opcional) `Access-Control-Allow-Methods` mantendo a lista extensa de headers já usada.
   - Validar que todos os `new Response` continuem com `corsHeaders`.

5. **Ajuste de robustez no bypass modal**
   - Em `CoachSpreadsheetTab` (`onForceBypass`), envolver com `try/finally` para nunca deixar `isSavingToDb` travado em caso de erro no bypass.

### Arquivos alvo
- `src/components/TextModelImporter.tsx`
- `src/workers/structuredParser.worker.ts` (novo)
- `src/hooks/useCoachWorkouts.ts`
- `src/components/CoachSpreadsheetTab.tsx`
- `supabase/functions/parse-workout-blocks/index.ts` (apenas hardening leve de CORS, sem encurtar headers)

### Resultado esperado
- Botão **nunca** fica preso em “Validando...” (mesmo com texto patológico).
- Em falha de backend/rede, coach recebe modal Gatekeeper vermelho com bypass.
- Fluxo Preview/Salvar permanece responsivo no Preview e produção.
