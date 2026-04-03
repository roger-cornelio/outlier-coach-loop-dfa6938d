

## Plano: CRM Unificado 360° com Detalhe do Atleta

### Visão Geral

Reescrever o `CRMAdmin` com 3 abas: **Visão Geral** (tabela unificada de todos os usuários), **Leads Diagnóstico** (tabela de `diagnostic_leads`), e as abas existentes (Clientes/Leads manuais + Duplas). Ao clicar em qualquer usuário na Visão Geral, abre um modal/drawer com ficha completa do atleta.

### Aba "Visão Geral" — Tabela Unificada

Cruza `profiles` + `coach_athletes` + `diagnostic_leads` para montar uma lista única com:

| Coluna | Fonte |
|--------|-------|
| Nome, Email | `profiles` |
| Status | Calculado: Ativo (last_active < 14d), Inativo (> 14d), Suspenso, Sem coach |
| Coach vinculado | `coach_athletes` → `profiles` (nome do coach) |
| Nível | `profiles.training_level` |
| Setup completo | `profiles.first_setup_completed` |
| Cadastro | `profiles.created_at` |
| Último acesso | `profiles.last_active_at` |

**Filtros rápidos** (chips): Todos · Ativos · Inativos · Vinculados · Sem Coach · Suspensos

**Busca** por nome/email.

### Aba "Leads Diagnóstico"

Lista de `diagnostic_leads` com: nome buscado, evento, divisão, data, se converteu. Cruzamento com `profiles` via `user_id` para mostrar se o lead virou usuário cadastrado.

### Modal de Detalhe do Atleta (ao clicar na linha)

Abre um `Sheet` (drawer lateral) com ficha completa, buscando dados de múltiplas tabelas:

**Seção 1 — Perfil**
- Nome, email, sexo, idade, peso, altura
- Nível de treino, duração de sessão, equipamentos indisponíveis
- Objetivos do onboarding (experiência, goal, target race)
- Data de cadastro, último acesso, status da conta

**Seção 2 — Engajamento**
- Tempo na plataforma: diferença entre `created_at` e `now()` (ex: "3 meses e 12 dias")
- Total de sessões registradas: `COUNT` de `workout_session_feedback` do atleta
- Frequência média: sessões / semanas desde cadastro
- Total de benchmarks realizados: `COUNT` de `benchmark_outlier_results`
- Provas cadastradas: `COUNT` de `athlete_races`

**Seção 3 — Vínculo**
- Coach atual (nome + email) ou "Sem coach"
- Data de vinculação (`coach_athletes.created_at`)
- Histórico de diagnósticos: lista de `diagnostic_leads` do user

**Seção 4 — Qualificação (Lead Score visual)**
- Badge automático baseado em regras simples:
  - **Hot** 🔴: > 10 sessões ou setup completo + ativo
  - **Warm** 🟡: cadastro completo mas < 5 sessões
  - **Cold** 🔵: só diagnóstico ou inativo > 30 dias

### Arquivos alterados

1. **`src/components/admin/CRMAdmin.tsx`** — Reescrever completamente: adicionar aba "Visão Geral" como default, aba "Leads Diagnóstico", manter abas existentes. Incluir componente de detalhe (Sheet) com todas as seções acima.

### Sem alteração no banco

Todos os dados já existem em `profiles`, `coach_athletes`, `diagnostic_leads`, `workout_session_feedback`, `benchmark_outlier_results`, `athlete_races`. Queries client-side com joins manuais via JS.

