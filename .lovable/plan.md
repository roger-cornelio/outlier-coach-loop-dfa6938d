

## Plano: Fazer Roger Cornelio aparecer como coach na lista

### Problema
As RPCs `get_recommended_coaches` e `search_coaches_by_name` buscam apenas da tabela `coach_applications` com `status = 'approved'` e `auth_user_id IS NOT NULL`. Roger (`roger.bm2016@gmail.com`) nunca foi inserido nessa tabela — ele é superadmin e teve a role de coach concedida diretamente.

### Solução
Inserir um registro na tabela `coach_applications` para Roger, com status `approved` e `auth_user_id` preenchido. Isso faz ele aparecer automaticamente nas buscas e recomendações sem alterar nenhuma função.

### Alteração (migração SQL)

Inserir em `coach_applications`:
- `full_name`: "Roger Cornelio"
- `email`: "roger.bm2016@gmail.com"
- `status`: "approved"
- `auth_user_id`: (o user_id dele: `1d5b0b82-42c5-4734-a5c3-04a0ccdab1b2`)

### O que não muda
- Funções RPC, código front-end, RLS

