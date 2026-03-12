

## Plano: Adaptar o Diagnóstico IA para Respeitar o Coach Style (IRON/PULSE/SPARK)

### O que muda

A Edge Function `generate-diagnostic-ai` atualmente usa um tom fixo ("Treinador de Elite pragmático"). Vamos adicionar personalidade variável baseada no `coachStyle` do atleta, seguindo o mesmo padrão já usado em `generate-workout-feedback`.

### Mudanças

**1. Edge Function `generate-diagnostic-ai/index.ts`**
- Aceitar novo campo `coach_style` no body (default: `'PULSE'`)
- Adicionar bloco de personalidade ao system prompt baseado no estilo:
  - **IRON**: Tom de comandante — direto, seco, verdade crua, sem firulas
  - **PULSE**: Tom de parceiro — humano, técnico, consistente (comportamento atual, mantido como default)
  - **SPARK**: Tom motivador — energia positiva, celebra progresso, leve
- Inserir as diretrizes de personalidade antes das diretrizes de comportamento existentes

**2. Frontend `ImportarProva.tsx`**
- Já tem acesso ao store via `useOutlierStore` (linha 106)
- Extrair `coachStyle` do store e passar como `coach_style` na chamada da edge function
- Fallback para `'PULSE'` se não definido

### Exemplo de injeção no prompt

```text
PERSONALIDADE DO TREINADOR: IRON
- Seja seco, direto e exigente. Sem rodeios ou elogios excessivos.
- Use frases curtas e impactivas. Tom de comandante experiente.
- Reconheça mérito com sobriedade, nunca com entusiasmo.

[...rest of existing prompt...]
```

### Arquivos afetados
- `supabase/functions/generate-diagnostic-ai/index.ts` — adicionar mapa de personalidades e injetar no prompt
- `src/pages/ImportarProva.tsx` — passar `coach_style` na chamada

