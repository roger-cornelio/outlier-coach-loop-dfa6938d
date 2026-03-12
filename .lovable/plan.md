

## Correção: Migrar `generate-deep-analysis` para Lovable AI Gateway

### Problema
Os logs mostram:
```
Anthropic error 404: model: claude-3-5-sonnet-20241022
```
O modelo foi descontinuado. A API retorna 404, o frontend recebe erro e mostra "A IA não retornou análise."

### Solução
Migrar de Anthropic API direta → Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`), usando `LOVABLE_API_KEY` (já configurada) e modelo `google/gemini-2.5-flash`.

### Mudança

**`supabase/functions/generate-deep-analysis/index.ts`**
- Trocar `ANTHROPIC_API_KEY` → `LOVABLE_API_KEY`
- Trocar endpoint `api.anthropic.com` → `ai.gateway.lovable.dev/v1/chat/completions`
- Trocar formato Anthropic → formato OpenAI (messages com system + user)
- Modelo: `google/gemini-2.5-flash`
- Extrair resposta de `choices[0].message.content` em vez de `content[0].text`

1 arquivo afetado. Prompt e lógica de cache permanecem iguais.

