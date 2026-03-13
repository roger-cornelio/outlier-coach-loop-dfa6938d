

## Migrar `generate-simulado-comparison` para Claude 3.5 Sonnet

### Motivação
Usuário prefere qualidade do Claude para análises textuais em PT-BR. A `ANTHROPIC_API_KEY` já está configurada.

### Mudança

**Arquivo**: `supabase/functions/generate-simulado-comparison/index.ts`

- Trocar chamada de `https://ai.gateway.lovable.dev/v1/chat/completions` → `https://api.anthropic.com/v1/messages`
- Usar `ANTHROPIC_API_KEY` em vez de `LOVABLE_API_KEY`
- Adaptar payload: formato OpenAI (`messages[].role`) → formato Anthropic (`messages[]` com system separado)
- Modelo: `claude-3-5-sonnet-20241022`
- Manter mesmo system prompt, mesma lógica de erro (429/402), mesmo response shape `{ analysis: text }`
- `max_tokens: 1500`, timeout de 30s via AbortController

### Arquivos
- `supabase/functions/generate-simulado-comparison/index.ts`

