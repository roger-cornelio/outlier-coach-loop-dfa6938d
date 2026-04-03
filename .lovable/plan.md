

## Análise: O que falta para 9/10 com 10 atletas e 2 coaches

### O que JÁ está pronto (nota atual: ~7.5/10)

| Área | Status |
|------|--------|
| Onboarding atleta (10 passos) | OK |
| Onboarding coach (3 passos + tour) | OK |
| Dashboard atleta com radar diagnóstico | OK |
| Treino semanal com skeleton + empty states | OK |
| Execução de treino + celebração pós-treino | OK |
| Feedback pós-treino com IA | OK |
| Streak de treinos | OK |
| Pull-to-refresh mobile | OK |
| Dark mode | OK |
| Bottom nav mobile (5 tabs) | OK |
| Coach: publicar treinos, vincular atletas | OK |
| Coach: KPIs + lista expandível de atletas | OK |
| Coach: feedbacks tab com filtro por atleta | OK |
| Coach: busca por atleta + filtro de período | OK |
| Prova alvo + simulador HYROX | OK |
| Polish responsivo 430px | OK (~99%) |

---

### O que FALTA para 9/10 (6 gaps)

**1. Notificações in-app para o coach** (impacto alto)
Quando um atleta completa treino, registra resultado ou envia feedback, o coach não sabe — precisa entrar e verificar manualmente. Com 10 atletas, isso é inviável.
- Criar tabela `notifications` (user_id, type, title, body, read, created_at)
- Trigger no banco: ao inserir em `workout_completions` ou `session_feedbacks`, gerar notificação para o coach
- Badge de "não lidas" no sidebar/bottom nav do coach
- Lista de notificações com mark-as-read

**2. Confirmação visual de publicação para o coach** (impacto médio)
Após publicar treinos, o coach não tem feedback claro de "quais atletas já receberam". Falta um status por atleta na lista (publicado/visto/executado).
- Coluna "status" nos cards de atleta da aba overview: "Publicado", "Visto", "Treinou"
- Baseado em dados já existentes (athlete_plans.status + workout_completions)

**3. ErrorBoundary global** (impacto médio)
O ErrorBoundary existe mas só protege o TextModelImporter. Um crash em qualquer outra tela mostra tela branca. Com 10 atletas usando, crashes eventuais são inevitáveis.
- Envolver o App inteiro com ErrorBoundary genérico
- Mensagem: "Algo deu errado. Toque para recarregar."

**4. Loading states consistentes no Dashboard do coach** (impacto médio)
Os KPI cards do CoachOverviewTab não mostram skeleton durante carregamento — ficam zerados e depois piscam com os valores reais. Parece bugado.
- Skeleton nos 4 KPI cards enquanto `loading === true`

**5. Transição suave entre views do atleta** (impacto baixo-médio)
Atualmente a troca entre Dashboard → Treino → Evolução → Config é instantânea sem animação. Parece "tosco" comparado a apps nativos.
- Adicionar `framer-motion` AnimatePresence com fade de 150ms nas trocas de view dentro do Index.tsx

**6. Mensagem de boas-vindas contextual no coach** (impacto baixo)
Quando o coach entra pela primeira vez com 0 atletas, a tela de overview fica vazia sem orientação. Com 2 coaches novos, ambos vão sentir o app "oco".
- Empty state no CoachOverviewTab: "Vincule seu primeiro atleta" com CTA para busca por email

---

### Plano de implementação (4 batches)

**Batch 1 — ErrorBoundary global + skeleton coach KPIs**
- Envolver `<Routes>` em App.tsx com ErrorBoundary
- Skeleton nos KPI cards do CoachOverviewTab

**Batch 2 — Notificações in-app**
- Tabela `notifications` com RLS (user vê suas, admin vê todas)
- Trigger de banco: workout_completions INSERT → notificação para coach
- Componente NotificationBell no header do coach
- Lista de notificações com scroll e mark-as-read

**Batch 3 — Status de publicação + empty state coach**
- Coluna visual "Publicado/Visto/Treinou" no card de atleta
- Empty state no CoachOverviewTab com CTA de vincular atleta

**Batch 4 — Transições de view**
- AnimatePresence com fade nas trocas de view do atleta (Index.tsx)

### Estimativa
- ~8 arquivos alterados, 1 tabela nova (notifications), 1 trigger
- Resultado: experiência coesa para 10 atletas + 2 coaches sem nenhum momento de "isso parece inacabado"

