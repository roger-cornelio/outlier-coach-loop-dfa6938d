

## Plano: Mostrar botão INICIAR TREINO mesmo em semanas passadas

### Problema

Linha 648: `{!isViewingHistory && (` esconde o botão quando o atleta navega para a semana anterior. O atleta pode ter perdido um treino e querer fazê-lo depois — não faz sentido bloquear.

### Alteração

**Editar `src/components/WeeklyTrainingView.tsx`:**
- Remover a condição `!isViewingHistory` da linha 648, deixando o botão sempre visível quando há treino disponível para o dia selecionado

Uma linha alterada, zero risco de quebra.

