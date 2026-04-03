

## Plano: Status por Atleta + Verificação de Triggers

### Contexto

O empty state para coaches sem atletas **já existe** (linhas 756-766 do CoachOverviewTab). O único item pendente do plano de 6 gaps é o **status visual por atleta** ("Publicado / Visto / Treinou") nos cards da lista.

### O que será feito

**1. Badge de status de treino semanal por atleta**

Na linha de cada atleta (entre o RiskBadge e o contador de dias inativos), adicionar um pequeno badge que mostra o status da semana atual:

- **"Treinou"** (verde) → Existe registro em `workout_session_feedback` esta semana
- **"Publicado"** (azul) → Existe `athlete_plans` com status `published` para esta semana, mas sem feedback
- **Sem badge** → Nenhum plano publicado para esta semana

A lógica será calculada via uma query leve no `ExpandableAthleteRow` ao montar, consultando `athlete_plans` (publicado esta semana?) e `workout_session_feedback` (feedback esta semana?).

**2. Verificar triggers de notificação**

Consultar o banco para confirmar que os triggers `notify_coach_on_feedback` e `notify_coach_on_benchmark` estão ativos e vinculados às tabelas corretas. Se não estiverem, criar migração para ativá-los.

### Arquivos alterados

1. **`src/components/CoachOverviewTab.tsx`** — Adicionar badge de status semanal na `ExpandableAthleteRow`

### Sem alteração no banco (exceto se triggers estiverem inativos)

O badge usa queries client-side sobre tabelas já existentes.

