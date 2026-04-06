

## Plano: Garantir que a mensagem de IA inclua dificuldade relativa (contexto + x/10)

### Situação atual

Os templates locais do `DailyBriefingCard` já incluem frases como "esse é dos mais pesados — 8 de 10" e "hoje é mais leve — 3 de 10". Isso já funciona no modo local.

O problema aparece quando a edge function `generate-workout-feedback` gera a mensagem: ela recebe `blocks`, `coachStyle`, `dayName` e `intensity` (easy/medium/hard) — mas **não recebe o score numérico nem a posição relativa na semana**. Resultado: a IA não menciona se é o treino mais pesado ou mais leve.

### Alterações

**Editar `src/components/DailyBriefingCard.tsx`:**
- Na chamada à edge function (no `useEffect` que chama `generate-workout-feedback`), passar campos adicionais no body:
  - `intensityScore` (1-10, já calculado localmente)
  - `intensityLabel` — texto como "o mais pesado da semana", "dos mais leves", "intermediário"
  - `estimatedMinutes` (já disponível)

**Editar `supabase/functions/generate-workout-feedback/index.ts`:**
- Aceitar os novos campos opcionais: `intensityScore`, `intensityLabel`, `estimatedMinutes`
- Incluir no `userPrompt` uma instrução clara:
  - "O treino de hoje tem dificuldade X de 10 na semana. [intensityLabel]. Inclua isso naturalmente na sua fala."
- Manter a regra de 2-3 frases no prompt

### Exemplo de resultado

**Score 8/10:**
> "Hoje tem deadlift pesado e wall ball por 5 rounds — uns 52 minutos. O deadlift vai ser o ponto crítico. Na semana, esse é 8 de 10 — o mais pesado. Controla a respiração e não sai queimando nos primeiros rounds."

**Score 3/10:**
> "Hoje é mais técnico, com foco em skill e mobilidade — uns 35 minutos. Na semana, esse é 3 de 10 — aproveita pra caprichar na execução. Dia de construir base."

### Resultado
- A IA sempre contextualiza o treino na semana com número + texto descritivo
- Funciona tanto no template local (fallback) quanto na mensagem gerada por IA
- Zero mudança visual — apenas conteúdo mais completo

