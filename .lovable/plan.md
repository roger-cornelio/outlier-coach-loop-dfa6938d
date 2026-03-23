

## Plano: Eliminar Feedback Repetitivo da IA

### Problema

O prompt atual não tem nenhuma instrução anti-repetição. A IA sempre cai no mesmo padrão de encerramento: "tomar água, comer bem, descansar, bora que amanhã tem mais". Isso acontece porque o modelo encontra esse padrão como "fecho seguro" e repete sem variação.

### Solução

Atualizar o prompt do system na Edge Function `generate-performance-feedback` com regras anti-repetição:

| Arquivo | Alteração |
|---|---|
| `supabase/functions/generate-performance-feedback/index.ts` | Adicionar regras anti-repetição no systemPrompt |

### O que muda no prompt

1. **Proibir frases clichê explicitamente** — adicionar na lista de PROIBIDO:
   - "tomar muita água"
   - "comer bem e descansar"
   - "bora que amanhã tem mais"
   - "o corpo merece"
   - "agora é descansar"
   - Qualquer variação de conselho genérico de recuperação

2. **Instrução de variação** — adicionar regra: "NUNCA termine com conselho de hidratação/alimentação/descanso. Termine com algo ESPECÍFICO sobre o treino que ele acabou de fazer ou sobre o próximo desafio técnico."

3. **Dar alternativas de encerramento ao modelo** — instruir que o fechamento pode ser:
   - Um comentário sobre um bloco específico que se destacou
   - Uma provocação sobre o próximo treino
   - Uma observação sobre ritmo/pacing que ele pode ajustar
   - Silêncio (para IRON, às vezes menos é mais)

### Resultado esperado

Cada feedback será único, focado nos dados reais do treino, sem cair em fórmulas genéricas de encerramento.

