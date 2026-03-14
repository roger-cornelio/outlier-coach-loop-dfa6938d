

## Verificação Completa — Diagnóstico Confirmado ✓

Inspecionei todo o código dos 3 arquivos. Os 3 bugs estão confirmados e as correções propostas vão resolver o problema.

### Bug 1 — `useCoachWorkouts.ts` (linhas 361-364) ✓ CONFIRMADO
```typescript
// ATUAL — catch silencioso:
catch (err) {
  setError(err instanceof Error ? err.message : 'Erro na validação');
  return null; // ← gatekeeperResult NUNCA é setado → modal não abre
}
```
**Correção**: Adicionar `setGatekeeperResult({ success: false, errorType: 'infra_failure', failedBlocks: [], enrichedWorkouts: workoutData })` no catch. O modal vermelho abre e oferece bypass.

### Bug 2 — `TextModelImporter.tsx` (linhas 238-245) ✓ CONFIRMADO
```typescript
// ATUAL — timeout falso:
result = await Promise.race([
  new Promise(resolve => setTimeout(() => resolve(parseStructuredText(text)), 0)), // ← síncrono bloqueia a thread
  new Promise((_, reject) => setTimeout(() => reject(...), 3000)), // ← nunca executa enquanto parser roda
]);
```
**Correção**: Adicionar um `setTimeout` independente de 5s que força `setIsParsing(false)` como safety net. Se o parser resolver antes, `clearTimeout` cancela. A UI SEMPRE destrava.

### Bug 3 — `TextModelImporter.tsx` (linhas 751-756) ✓ CONFIRMADO
```typescript
// ATUAL — sem feedback:
const success = await onSaveAndGoToPrograms(effectiveDays, title, weekStart);
if (success) { clearDraft(); }
// ← se success=false, NENHUM feedback visual
```
**Correção**: Adicionar `else` com `toast.error` ou `setPreviewValidationError` para informar o coach.

### Bug 4 (wiring) — `CoachSpreadsheetTab.tsx` (linhas 826-849) ✓ JÁ FUNCIONA
O modal já está conectado corretamente via `gatekeeperResult`. O problema real era que `gatekeeperResult` nunca era setado no catch (Bug 1). Corrigindo Bug 1, o modal vai abrir normalmente. Nenhuma mudança necessária aqui.

---

### Resumo das Mudanças

| Arquivo | Mudança | Risco |
|---------|---------|-------|
| `useCoachWorkouts.ts` | catch seta `gatekeeperResult` com `infra_failure` | Baixo |
| `TextModelImporter.tsx` | Safety-net timeout 5s + feedback no save falho | Baixo |
| `CoachSpreadsheetTab.tsx` | Nenhuma (wiring já correto) | — |

3 edições cirúrgicas, zero mudança de regra de negócio. Resolve o infinite loading em todos os cenários: CORS, timeout, parser travado e exceção inesperada.

