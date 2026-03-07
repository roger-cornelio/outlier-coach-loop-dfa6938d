

## Plano: Corrigir bug de importação — metadados da prova errada

### Problema
Quando o usuário clica para importar a prova de "São Paulo", o sistema salva os metadados da prova do "Mexico". Isso acontece porque a função `parseDiagnosticResponse()` extrai os campos `evento`, `temporada`, `divisao` e `finish_time` da resposta da API externa, que pode retornar dados inconsistentes ou de outra prova.

### Causa raiz
Em `generateDiagnostic()` no `RoxCoachExtractor.tsx`, o `parsed.resumoRow` usa dados vindos da API externa (proxy-roxcoach), não do `SearchResult` que o usuário clicou. A API externa é a fonte dos dados de análise (splits, melhorias), mas **não é confiável** para metadados de identificação da prova.

### Solução

**Arquivo: `src/components/RoxCoachExtractor.tsx`**

1. **Sobrescrever metadados do resumo** — Após chamar `parseDiagnosticResponse()`, sobrescrever os campos de identificação do `resumoRow` com os dados do `SearchResult` (que veio da busca Hyrox e é a fonte confiável):
   - `evento` ← `result.event_name`
   - `temporada` ← `String(result.season_id)`
   - `divisao` ← `result.division`
   - `finish_time` ← `result.time_formatted`
   - `nome_atleta` ← `result.athlete_name`

2. **Adicionar verificação de duplicata** — Antes de inserir, checar se já existe um `diagnostico_resumo` com o mesmo `atleta_id` e `source_url` (roxCoachUrl). Se existir, exibir toast informativo e não duplicar.

### Detalhes técnicos

Trecho a alterar (linha ~208):
```typescript
const parsed = parseDiagnosticResponse(proxyData, user.id, roxCoachUrl);

// Sobrescrever metadados com dados do SearchResult (fonte confiável)
parsed.resumoRow.evento = result.event_name;
parsed.resumoRow.temporada = String(result.season_id);
parsed.resumoRow.divisao = result.division;
parsed.resumoRow.finish_time = result.time_formatted;
parsed.resumoRow.nome_atleta = result.athlete_name;
```

Trecho de deduplicação (antes do insert):
```typescript
const { data: existingDiag } = await supabase
  .from('diagnostico_resumo')
  .select('id')
  .eq('atleta_id', user.id)
  .eq('source_url', roxCoachUrl)
  .maybeSingle();

if (existingDiag) {
  toast.info('Diagnóstico desta prova já foi importado.');
  return ['já importado'];
}
```

### Resumo
- **1 arquivo alterado**: `RoxCoachExtractor.tsx`
- **Sem migração de banco** necessária
- O `SearchResult` passa a ser a fonte de verdade para os metadados visuais dos cards
- A API externa continua sendo usada apenas para os dados de análise (splits, melhorias, texto IA)

