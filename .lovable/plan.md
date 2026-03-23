

## Plano: Resumo IA do treino do dia na tela de treino semanal

### O que será feito

Abaixo do tempo e calorias estimadas e **antes dos blocos de treino**, exibir um card com um resumo gerado por IA sobre o treino daquele dia. O texto será escrito no tom do coach escolhido (IRON, PULSE ou SPARK) e vai:

1. Explicar o objetivo do treino de forma clara
2. Apontar onde o atleta vai "sangrar mais" (parte mais difícil)
3. Motivar o atleta a fazer o treino

### Como funciona

- Quando o atleta seleciona um dia com treino, o sistema chama a Edge Function `generate-preworkout-message` já existente (ou cria uma nova variante) passando o resumo técnico do treino daquele dia
- A IA gera 2-3 frases no tom do coach, focadas no conteúdo real do treino
- O texto aparece num card destacado entre as estatísticas (tempo/kcal) e os blocos de exercício
- Enquanto carrega, mostra um skeleton/loading sutil
- O texto é cacheado por dia para não chamar a IA toda vez que troca de aba e volta

### Diferença da PreWorkoutScreen

A PreWorkoutScreen já faz algo parecido mas é uma tela cheia antes do treino. Aqui é um card inline na visualização do treino semanal — mais curto, contextual, sempre visível quando o atleta navega entre os dias.

### Edge Function

Reutilizar a `generate-preworkout-message` existente, que já recebe `coachStyle`, `workoutSummary` e `sex`. O prompt será ajustado para incluir instrução de mencionar a parte mais difícil do treino. Pode ser feito com um novo campo `mode: 'daily_summary'` no body para diferenciar do uso na tela de pré-treino.

### Alterações

| Arquivo | O que muda |
|---|---|
| `src/components/WeeklyTrainingView.tsx` | Adicionar estado para mensagem IA, chamar edge function quando troca de dia, renderizar card entre stats e blocos |
| `supabase/functions/generate-preworkout-message/index.ts` | Adicionar modo `daily_summary` com prompt mais detalhado sobre onde o treino pega mais pesado |

### Regras do texto gerado

- 2-3 frases no máximo
- Deve mencionar o foco principal do treino (ex: "força + condicionamento")
- Deve apontar o bloco ou momento mais intenso (ex: "o AMRAP de 15 min vai testar seu fôlego")
- Deve motivar sem ser genérico
- Tom 100% alinhado com o coach escolhido
- Baseado nos blocos reais, tipos, estruturas e duração — nunca inventar estímulos

