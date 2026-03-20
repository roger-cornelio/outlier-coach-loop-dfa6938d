

## Plano: Eliminar Feedback Genérico da Edge Function

### Problema Raiz
A Edge Function `generate-performance-feedback` tem um `catch` genérico (linha 407-416) que retorna a mensagem hardcoded **"Treino registrado. Continue evoluindo."** com status 200. Como o frontend recebe status 200, ele aceita como sucesso e nunca ativa o fallback local (que já está correto).

Além disso, a função `classifyPerformance` na Edge Function retorna `'OK'` para treinos completados sem tempo (linha 44), enquanto o classificador local já foi corrigido para retornar `'STRONG'`.

### Solução

**1. Corrigir o `catch` da Edge Function** (`supabase/functions/generate-performance-feedback/index.ts`)
- No bloco `catch`, em vez de retornar a mensagem genérica, retornar `{ error: "...", bucket: null, feedback: null }` com **status 500** (ou sem feedback)
- Isso faz o frontend cair no caminho de erro e usar o fallback local que já tem mensagens específicas por bucket e coach

**2. Alinhar `classifyPerformance` da Edge Function**
- Linha 44: trocar `if (!timeInSeconds) return 'OK'` para `if (!timeInSeconds) return 'STRONG'`
- Consistência com o classificador local

**3. Verificar autenticação** 
- O método `supabase.auth.getClaims(token)` pode não existir nesta versão do SDK, causando exceção que cai no `catch` genérico
- Substituir por `supabase.auth.getUser()` que é o método padrão e estável

### Arquivos Modificados
- `supabase/functions/generate-performance-feedback/index.ts`

### Resultado
Quando a Edge Function falhar por qualquer motivo, o frontend usará o fallback local com mensagens específicas ao bucket e ao estilo do coach. A mensagem "Treino registrado. Continue evoluindo." nunca mais aparecerá.

