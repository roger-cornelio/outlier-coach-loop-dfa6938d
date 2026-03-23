

## Plano: Resumo da Sessão com Comparação Visual + Feedback do Atleta para o Coach

### O que será feito

**1. Melhorar o Resumo da Sessão (tela de feedback)**
- Cada bloco no resumo mostrará: nome do bloco, valor registrado, valor esperado, e a **diferença** colorida
- **Verde** quando o resultado for positivo (mais rápido que esperado, mais rounds que esperado)
- **Vermelho** quando for negativo (mais lento, menos rounds)
- Para AMRAP: mostrar "10 rounds (esperado: ~9)" com a diferença "+1 round" em verde
- Para FOR TIME: mostrar "10:30 (esperado: 15:00)" com "-4:30" em verde
- EMOM/Strength: apenas "Concluído" sem comparação

**2. Caixa de feedback do atleta para o coach**
- Na tela de feedback (PerformanceFeedback), adicionar um campo de texto abaixo do feedback da IA
- Placeholder: "Como foi o treino? Deixe um recado pro seu coach..."
- Botão de enviar que salva no banco de dados
- O atleta pode pular (não é obrigatório)

**3. Tabela no banco de dados**
- Nova tabela `workout_session_feedback` com:
  - `id`, `athlete_id` (ref profiles), `coach_id`, `workout_day`, `session_date`, `block_results` (JSON com resultados dos blocos), `athlete_comment` (texto livre), `ai_feedback` (texto da IA), `created_at`
- RLS: atleta só vê/insere os próprios; coach vê os de seus atletas vinculados

**4. Visualização no painel do Coach**
- Nova aba "Feedbacks" no CoachDashboard (ou seção dentro de Visão Geral)
- Lista cronológica dos feedbacks recebidos de todos os atletas
- Filtro por atleta
- Cada card mostra: nome do atleta, data, dia do treino, resumo dos blocos (esperado vs feito), e o comentário escrito pelo atleta
- Coach pode ver rapidamente quem está performando acima/abaixo e o que cada atleta relatou

### Arquivos alterados

| Arquivo | Alteração |
|---|---|
| **Migration SQL** | Criar tabela `workout_session_feedback` com RLS |
| `src/components/PerformanceFeedback.tsx` | Reformular resumo com esperado/feito/diferença colorida + campo de texto + salvar no banco |
| `src/pages/CoachDashboard.tsx` | Adicionar aba "Feedbacks" |
| `src/components/CoachFeedbacksTab.tsx` | Novo componente — lista de feedbacks dos atletas com filtro |
| `src/hooks/useAthleteFeedbacks.ts` | Hook para buscar feedbacks (coach) e salvar (atleta) |

### Formato do resumo na tela

```text
RESUMO DA SESSÃO

Strength               10:30  (est. 15:00)   -4:30 ← verde
15' AMRAP              10 rounds (est. ~9)    +1    ← verde  
15' AMRAP              5 rounds (est. ~8)     -3    ← vermelho
EMOM                   Concluído
```

