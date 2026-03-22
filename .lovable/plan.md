

## Plano: Implementar Analytics de Uso (Ponto 5) + Push Notifications (Ponto 4)

### ETAPA 1 — Analytics de Uso (Dashboard Admin)

A tabela `events` já existe e rastreia `app_opened` (12k+ registros). O hook `useEvents` também já existe mas só é usado em 2 lugares. O plano é:

#### 1a) Expandir rastreamento de eventos no app
Adicionar `trackEvent` nos fluxos críticos que ainda não rastreiam:
- **Dashboard.tsx**: `workout_viewed` quando atleta abre treino
- **WeeklyTrainingView.tsx**: `workout_completed` quando marca treino como concluído
- **BenchmarksScreen.tsx**: `benchmark_completed` quando registra resultado
- **CoachDashboard.tsx**: `coach_analytics_viewed` quando coach abre dashboard

#### 1b) Criar dashboard de Analytics no Admin Portal
Novo componente `src/components/admin/AnalyticsDashboard.tsx` com:
- **DAU** (Daily Active Users): count distinct `user_id` de `app_opened` por dia (últimos 30 dias)
- **WAU** (Weekly Active Users): mesma lógica, janela 7 dias
- **MAU** (Monthly Active Users): janela 30 dias
- **Retenção D7**: % de usuários que voltaram 7 dias após primeiro acesso
- **Top eventos**: tabela com contagem de cada `event_name`
- Gráfico de linha (DAU ao longo do tempo) usando Recharts (já no projeto)

#### 1c) Adicionar aba "Analytics" no AdminPortal
Nova view no `AdminPortal.tsx` com ícone `BarChart3` na sidebar.

#### Arquivos
- `src/hooks/useEvents.ts` — adicionar novos event names ao tipo
- `src/components/admin/AnalyticsDashboard.tsx` — novo componente
- `src/pages/AdminPortal.tsx` — nova aba
- `src/components/Dashboard.tsx`, `WeeklyTrainingView.tsx`, `BenchmarksScreen.tsx`, `CoachDashboard.tsx` — adicionar `trackEvent`

---

### ETAPA 2 — Push Notifications (após Analytics concluído)

#### 2a) Criar tabela `push_subscriptions`
```sql
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth_key text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);
```
Com RLS: usuário pode inserir/deletar/ver as próprias subscriptions.

#### 2b) Gerar VAPID keys e criar Service Worker
- Gerar par de chaves VAPID (salvar private key como secret, public key no `.env`)
- Criar `public/sw.js` com handler de push events
- Criar hook `usePushNotifications.ts` para pedir permissão e salvar subscription

#### 2c) Edge Function `send-push-notification`
- Recebe `user_id` + `title` + `body`
- Busca subscriptions do user
- Envia via Web Push API

#### 2d) Integrar no fluxo de publicação
- Em `PublishToAthletesModal.tsx`, após publish com sucesso, chamar a edge function para notificar cada atleta

#### Arquivos
- Migration SQL para `push_subscriptions`
- `public/sw.js` — service worker
- `src/hooks/usePushNotifications.ts` — novo hook
- `supabase/functions/send-push-notification/index.ts` — nova edge function
- `src/components/PublishToAthletesModal.tsx` — integrar envio

### Detalhes técnicos
- Analytics usa queries diretas na tabela `events` existente (sem nova tabela)
- Push usa Web Push API padrão (funciona em Chrome, Edge, Firefox; limitado no Safari/iOS)
- VAPID keys são geradas uma vez e armazenadas como secrets

