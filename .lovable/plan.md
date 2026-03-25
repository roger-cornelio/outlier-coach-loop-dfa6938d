

## Correção: Migrar `generate-diagnostic-ai` para Lovable AI

### Problema

Os logs mostram claramente:
```
Anthropic error 404: model: claude-3-5-sonnet-20241022
```

O modelo Anthropic usado na edge function não existe mais. Por isso aparece "Análise indisponível".

### Solução

Migrar a edge function `generate-diagnostic-ai` de Anthropic para **Lovable AI Gateway** (que já está disponível com `LOVABLE_API_KEY`).

### Mudanças

**Arquivo: `supabase/functions/generate-diagnostic-ai/index.ts`**

1. Trocar a chamada de `https://api.anthropic.com/v1/messages` para `https://ai.gateway.lovable.dev/v1/chat/completions`
2. Usar `LOVABLE_API_KEY` em vez de `ANTHROPIC_API_KEY`
3. Formato do body: de Anthropic Messages API para OpenAI-compatible (messages com system + user, model `google/gemini-2.5-flash`)
4. Formato da resposta: de `result.content[0].text` para `result.choices[0].message.content`
5. Aumentar timeout de 30s para 60s
6. Tratar erros 429 (rate limit) e 402 (créditos)

### Detalhes técnicos

- Model: `google/gemini-2.5-flash` (bom equilíbrio custo/qualidade para texto longo em PT-BR)
- O system prompt (personalidade do coach + dados da corrida) vai no campo `messages[0].role: "system"` e o user prompt como `messages[1].role: "user"` pedindo a análise
- Não precisa de streaming — resposta completa é suficiente para este caso

