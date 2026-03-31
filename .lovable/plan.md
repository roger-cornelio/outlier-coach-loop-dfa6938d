

## Plano: Sistema de solicitação de mudança de plano (Athlete → Coach)

### Contexto
Atualmente, ao clicar no plano alternativo, o atleta recebe apenas um toast dizendo "fale com seu coach". O objetivo é criar um fluxo real de solicitação.

### 1. Criar tabela `plan_change_requests` (migration)

```sql
CREATE TABLE public.plan_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  current_plan TEXT NOT NULL,       -- 'open' ou 'pro'
  requested_plan TEXT NOT NULL,     -- 'open' ou 'pro'
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.plan_change_requests ENABLE ROW LEVEL SECURITY;

-- Atleta vê suas próprias requests
CREATE POLICY "athlete_own_requests" ON public.plan_change_requests
  FOR SELECT TO authenticated
  USING (athlete_user_id = auth.uid());

-- Atleta cria request
CREATE POLICY "athlete_insert_request" ON public.plan_change_requests
  FOR INSERT TO authenticated
  WITH CHECK (athlete_user_id = auth.uid());

-- Coach vê requests dos seus atletas
CREATE POLICY "coach_view_requests" ON public.plan_change_requests
  FOR SELECT TO authenticated
  USING (coach_id = auth.uid());

-- Coach atualiza status
CREATE POLICY "coach_update_requests" ON public.plan_change_requests
  FOR UPDATE TO authenticated
  USING (coach_id = auth.uid());
```

### 2. Alterações no `AthleteConfig.tsx` (seção SEU PLANO)

- Ao clicar no plano alternativo, inserir um registro em `plan_change_requests` com status `pending`
- Trocar o toast genérico por confirmação: "Solicitação de upgrade/downgrade enviada ao seu coach"
- Exibir banner abaixo dos botões de plano quando existir request pendente:
  - Upgrade: "⬆️ Upgrade para PERFORMANCE solicitado — aguardando aprovação do coach"
  - Downgrade: "⬇️ Downgrade para ESSENCIAL solicitado — aguardando aprovação do coach"
- Desabilitar clique no plano alternativo enquanto houver request pendente
- Buscar request pendente no mount via query simples

### 3. Alterações no `CoachOverviewTab.tsx` (dashboard do coach)

- Na área expandida do atleta, exibir badge/alerta quando há `plan_change_requests` pendente
- Mostrar: "🔔 Solicitação de [UPGRADE/DOWNGRADE] para [PLANO]" com botões Aprovar / Rejeitar
- Aprovar: atualiza `profiles.training_level`, seta status `approved`, seta `resolved_at`
- Rejeitar: seta status `rejected`, seta `resolved_at`

### Resumo de arquivos
- 1 migration SQL (nova tabela + RLS)
- `src/components/AthleteConfig.tsx` — lógica de request + banner pendente
- `src/components/CoachOverviewTab.tsx` — exibição + aprovação/rejeição

