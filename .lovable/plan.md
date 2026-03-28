

## Plano: Corrigir erro "column reference status is ambiguous" na RPC submit_coach_application

### Problema
A função `submit_coach_application` retorna colunas com os mesmos nomes (`status`, `created_at`) que são usados no `SELECT` interno da tabela `coach_applications`. O Postgres não consegue distinguir entre a coluna de output e a coluna da tabela, gerando o erro `42702: column reference "status" is ambiguous`.

### Solução
Criar uma migração que redefine a função, renomeando as variáveis de output para evitar conflito:
- `status` → `app_status`
- `created_at` → `app_created_at`

Ou, mais simples e sem quebrar o front-end: qualificar todas as referências internas com `v_existing.` e `v_inserted.`, e usar aliases explícitos no `SELECT`.

**Abordagem escolhida**: Recriar a função usando nomes de output prefixados (`out_`) para evitar qualquer ambiguidade, e atualizar o front-end (`CoachRequest.tsx`) para usar os novos nomes de campo no response.

### Alterações

**1. Migração SQL** — `CREATE OR REPLACE FUNCTION submit_coach_application`
- Output columns: `created`, `approved`, `application_id`, `out_status`, `out_created_at`
- Qualificar `SELECT` com alias de tabela (`ca.id, ca.status, ca.created_at`)
- Assignments usam os nomes `out_status` e `out_created_at`

**2. `src/pages/CoachRequest.tsx`**
- Atualizar referências de `row.status` para `row.out_status` (linha ~80)
- Atualizar `row.created_at` para `row.out_created_at` se usado

### O que não muda
- Lógica de negócio (validação, insert, dedup)
- Tabelas e RLS
- Outros fluxos de coach

