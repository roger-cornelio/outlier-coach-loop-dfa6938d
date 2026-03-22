
Diagnóstico

O publish está chegando no backend, mas a tela do atleta não está se atualizando sozinha.

O que confirmei:
- Já existem registros publicados em `athlete_plans` para a semana `2026-03-23` para atletas vinculados.
- A screenshot do atleta mostra a semana `23–29 mar.` com badge `PRÓXIMA`, ou seja, ele está vendo a semana futura.
- O hook `useAthletePlan` busca os planos apenas:
  - no mount
  - quando `selectedWeekStart` muda
- Não existe assinatura em tempo real nem refetch automático quando o coach publica depois que o atleta já abriu essa tela.

Conclusão mais provável:
1. O atleta abriu a semana futura antes da publicação.
2. A query veio vazia naquele momento.
3. O coach publicou depois.
4. Como a tela do atleta não refaz a busca sozinha, continua mostrando vazio até recarregar/navegar.

Plano de correção

1. Atualizar `useAthletePlan` para refazer a busca automaticamente quando houver mudança em `athlete_plans`
- Adicionar subscription de mudanças da tabela filtrada pelo `athlete_user_id`.
- Quando entrar/atualizar um plano `published` da semana selecionada, chamar `fetchPlans()`.

2. Adicionar refetch defensivo por foco/visibilidade
- Ao voltar para a aba ou focar a janela, refazer `fetchPlans()`.
- Isso cobre casos em que o publish ocorreu enquanto o atleta estava com a tela aberta.

3. Melhorar o estado vazio para não parecer erro definitivo
- Se a semana estiver vazia, exibir ação de “Atualizar”.
- Opcionalmente mostrar microcopy indicando que novos treinos publicados podem aparecer após atualização.

4. Validar persistência da semana
- Revisar a restauração via `outlier_week_anchor` para confirmar se o atleta não está ficando preso em semana futura sem perceber.
- Se necessário, manter a âncora apenas como conveniência, mas priorizar a semana atual no boot após novo login.

Arquivos envolvidos
- `src/hooks/useAthletePlan.ts`
- `src/components/WeeklyTrainingView.tsx`
- possivelmente `src/components/Dashboard.tsx` se precisarmos garantir aplicação imediata dos planos após refetch

Detalhes técnicos
- O problema não parece ser RLS nem falha de publicação.
- O problema principal é sincronização da UI do atleta após publicação.
- A evidência mais forte é:
  - dados publicados existem no banco
  - a tela do atleta mostra semana futura vazia
  - o hook não possui realtime, polling, nem refresh on focus
