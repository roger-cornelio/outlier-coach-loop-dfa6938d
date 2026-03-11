

## Problema

Todos os eventos na tabela `discovered_events` tem `status_validacao = 'AGUARDANDO_AUTORIZACAO_ADMIN'`. A RLS policy so permite leitura de eventos com `status_validacao = 'VALIDADA'`. Resultado: queries retornam array vazio.

Alem disso, os eventos oficiais HYROX globais inseridos anteriormente nao estao mais no banco.

## Solucao

1. **Atualizar eventos existentes** com `origem_principal = 'MANUAL'` e nomes HYROX para `status_validacao = 'VALIDADA'`
2. **Re-inserir calendario oficial HYROX 2025/2026** com `status_validacao = 'VALIDADA'` e `grau_confianca = 100`

### Migration SQL

- `UPDATE discovered_events SET status_validacao = 'VALIDADA', grau_confianca = 100 WHERE nome ILIKE '%HYROX%' AND tipo_evento = 'OFICIAL';`
- Re-inserir os ~40 eventos oficiais globais (Londres, Singapore, NYC, etc.) com status VALIDADA, origem HYROX, confianca 100

### Sem alteracao de codigo

O frontend e o hook `useDiscoveredEvents` ja estao corretos. O problema e exclusivamente dados no banco.

