

## Plano: Unificar Busca — Importar Prova + Diagnóstico OUTLIER em paralelo

### Situação Atual

Hoje existem **dois fluxos separados** que usam a mesma busca (`search-hyrox-athlete`):

1. **ImportarProva** — chama `scrape-hyrox-result` → salva em `benchmark_results` (tempos, splits, percentis)
2. **RoxCoachDashboard/Extractor** — chama `proxy-roxcoach` → salva em `diagnostico_resumo`, `diagnostico_melhoria`, `tempos_splits`

Ambos buscam pelo mesmo nome, retornam a mesma lista de provas e usam a mesma `result_url`.

### Proposta

Unificar numa única busca: quando o atleta seleciona uma prova, disparar **as duas chamadas em paralelo** (`scrape-hyrox-result` + `proxy-roxcoach`) e salvar tudo de uma vez.

### Mudanças

**1. Modificar `ImportarProva.tsx`**
- Após o atleta selecionar uma prova (ou batch), além de chamar `scrape-hyrox-result`, chamar `proxy-roxcoach` em paralelo com `Promise.all`
- Reutilizar a lógica de parsing do diagnóstico que já existe em `RoxCoachExtractor.tsx` (extrair para uma função utilitária compartilhada)
- Mostrar feedback unificado: "Prova importada + Diagnóstico gerado"

**2. Criar `src/utils/diagnosticParser.ts`**
- Extrair as funções de parsing do `RoxCoachExtractor` (`findValue`, `parsePotentialImprovement`, `timeToSeconds`, parsing de `resumo`, `splits`, `diagRows`) para um módulo reutilizável
- Exportar uma função tipo `parseDiagnosticResponse(apiData, userId, sourceUrl)` que retorna os objetos prontos para insert

**3. Modificar `RoxCoachDashboard.tsx`**
- Remover a busca duplicada — o diagnóstico já será gerado automaticamente na importação
- Manter apenas a visualização dos diagnósticos existentes e a opção de re-gerar se necessário

**4. Fluxo unificado na seleção de prova**
```text
Atleta busca nome
  → Lista de provas aparece
    → Seleciona prova(s)
      → Promise.all([
           scrape-hyrox-result (→ benchmark_results + percentis),
           proxy-roxcoach (→ diagnostico_resumo + melhoria + splits)
         ])
      → Toast: "Prova importada e diagnóstico gerado"
```

**5. Batch import**
- No import em lote, cada prova dispara ambas as chamadas em paralelo
- O diagnóstico mais recente fica como "ativo" na visualização

### Detalhes técnicos

- As duas edge functions já existem e não precisam de alteração
- Não há mudança de banco de dados — ambas as tabelas já existem
- A autorização de uso de dados (checkbox) já existe em `ImportarProva` e será mantida

