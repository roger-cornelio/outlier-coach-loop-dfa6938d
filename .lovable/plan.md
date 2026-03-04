

## Problema

A busca atual envia o nome completo do perfil dividido como `firstName="Roger"` e `lastName="Gabriel de Oliveira Cornelio"`. O site HYROX busca por correspondência exata no campo sobrenome, então não encontra "Roger Cornelio" — o nome com que o atleta está registrado.

## Solução

Modificar a **edge function** `search-hyrox-athlete` para gerar **múltiplas variantes de busca** automaticamente e combinar os resultados.

### Variantes de busca geradas (por temporada):

1. **Original**: firstName + lastName completo (ex: "Roger" + "Gabriel de Oliveira Cornelio")
2. **Só último sobrenome**: firstName + última palavra do lastName (ex: "Roger" + "Cornelio")

Se o lastName for uma única palavra, só executa uma busca (sem duplicar).

### Alteração técnica

**Arquivo: `supabase/functions/search-hyrox-athlete/index.ts`**

- Adicionar função `generateSearchVariants(firstName, lastName)` que retorna pares únicos `{firstName, lastName}` para tentar
- No handler principal, executar todas as variantes em paralelo para todas as temporadas
- A deduplicação por `result_url` já existe e continua funcionando

### Sem alterações no banco de dados ou no frontend

O frontend já envia o nome completo — a edge function é que vai gerar as variantes internamente.

