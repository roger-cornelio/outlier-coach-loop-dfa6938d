

## Diagnóstico: Por que os diagnósticos não estão sendo importados

### Causa raiz

A API externa de diagnóstico (`api-outlier.onrender.com/diagnostico`) está retornando **erro 500** para **todas** as variantes de nome do atleta:

```text
"Falha ao extrair: Atleta 'Caio Assayag' não encontrado no ranking."
"Falha ao extrair: Atleta 'Assayag, Caio' não encontrado no ranking."
"Falha ao extrair: Atleta 'CAIO ASSAYAG' não encontrado no ranking."
```

Testei 10+ combinações de nome, evento, divisão, URL e temporada. **Nenhuma funciona.** O problema é na API Python externa, não no app. A API pode ter atualizado o formato esperado ou estar com o ranking indisponível.

### O que podemos fazer no app

Como a API externa está instável, o plano é melhorar a resiliência e a experiência do usuário:

### 1. Mensagem de erro clara no `RoxCoachExtractor`

Quando o proxy retorna `upstream_error_detail` com "não encontrado no ranking", exibir um toast explicativo em vez do genérico "API indisponível":

> "O diagnóstico detalhado está temporariamente indisponível para esta prova. Os dados da prova foram salvos."

### 2. Fallback: salvar prova sem diagnóstico (modo `diagnostic_only`)

**Arquivo:** `src/components/RoxCoachExtractor.tsx`

Atualmente, se `generateDiagnostic` retorna `null`, a importação é contada como falha. Mudar para:
- Salvar um `diagnostico_resumo` mínimo (com nome, evento, finish_time, divisão) vindo do `SearchResult`
- Marcar como "diagnóstico pendente" para retry futuro
- Contar como sucesso parcial na UI

### 3. Botão de Retry no card de diagnóstico

**Arquivo:** `src/components/RoxCoachDashboard.tsx`

Quando um `diagnostico_resumo` existe mas sem `diagnostico_melhoria` associado (0 rows):
- Mostrar banner "Diagnóstico detalhado indisponível"
- Botão "Tentar novamente" que re-chama `proxy-roxcoach` com os dados do resumo

### 4. Melhorar mensagem no toast do `handleImportSelected`

Diferenciar entre "falha total" e "importação parcial (sem diagnóstico detalhado)":
- Sucesso total: "Diagnóstico completo importado"
- Parcial: "Prova salva. Diagnóstico detalhado indisponível — tente novamente mais tarde."
- Falha: "Não foi possível importar esta prova."

### Resumo das alterações

| Arquivo | Mudança |
|---|---|
| `RoxCoachExtractor.tsx` | Fallback: salvar resumo mínimo quando proxy falha; mensagens diferenciadas |
| `RoxCoachDashboard.tsx` | Banner + botão retry para diagnósticos sem detalhes |

