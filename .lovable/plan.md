

## Diagnóstico do Problema

Confirmei no código: na linha 1581, a busca usa `profile.id` (que é a chave primária da tabela de perfis), mas os dados do diagnóstico foram gravados usando o ID de autenticação do usuário (`user_id`). São dois IDs completamente diferentes. Por isso a busca retorna vazio e o card de Projeção de Evolução nunca aparece.

## Plano de Correção (Dupla Segurança)

### Correção 1 — Consertar o ID errado (causa raiz)
- Trocar `profile.id` por `profile.user_id` na busca do diagnóstico (linha 1575 e 1581)
- Atualizar a dependência do efeito para `profile?.user_id`
- Isso faz a busca encontrar os dados corretos imediatamente

### Correção 2 — Fallback inteligente via scores do radar
- Se mesmo após a correção do ID a tabela `diagnostico_melhoria` estiver vazia (por exemplo, atleta novo que ainda não gerou diagnóstico completo), mas o radar já tem scores calculados, derivar o gap total a partir dos percentis das estações
- Estações com percentil baixo (ex: 20%) representam pontos fracos — o gap pode ser estimado pela diferença entre o tempo real e o tempo de referência do percentil 50
- Isso garante: **se o radar aparece, a projeção também aparece**

### Resumo
- **1 arquivo alterado**: `DiagnosticRadarBlock.tsx`
- **Zero impacto** em tabelas, Edge Functions ou cálculos existentes
- **Resultado**: o card de Projeção de Evolução volta a aparecer no Dashboard sempre que houver dados de diagnóstico disponíveis

