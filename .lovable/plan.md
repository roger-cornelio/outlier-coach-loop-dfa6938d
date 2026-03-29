

## Plano: Corrigir vinculação de coach no onboarding

### Problema
Quando um atleta tenta se vincular a um coach durante o cadastro, dá erro se já existiu qualquer solicitação anterior (aprovada, rejeitada ou expirada) para o mesmo coach. Isso acontece porque o banco só permite uma única solicitação por par atleta-coach, independente do status.

### Solução

**1. Banco de dados** — Flexibilizar a regra de unicidade:
- Permitir múltiplas solicitações históricas (rejeitadas, aprovadas antigas)
- Bloquear apenas duplicatas **pendentes** — ou seja, o atleta não pode ter duas solicitações abertas para o mesmo coach ao mesmo tempo

**2. Tela de seleção de coach** — Antes de criar uma nova solicitação:
- Limpar solicitações antigas que já foram resolvidas (rejeitadas/aprovadas)
- Criar a nova solicitação normalmente
- Se já existir uma pendente, avisar o atleta que já está aguardando aprovação

### Resultado
- Atletas podem re-solicitar coaches após rejeição ou troca
- Histórico não bloqueia novas tentativas
- Duplicatas pendentes continuam sendo impedidas

