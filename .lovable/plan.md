

## Plano: Validação rigorosa + nova chamada ao backend

### 1. Validação no `diagnosticParser.ts`

Adicionar uma função `validateDiagnosticData` chamada dentro de `parseDiagnosticResponse` (após o parsing, antes do return). Regras de rejeição que lançam `new Error('Invalid diagnostic data format')`:

- **Emoji check**: `movement` contém 🥇, 🥈, 🥉
- **Ranking check**: `movement` é puramente classificatório (regex `/^\d+(st|nd|rd|th)$/i`)
- **Zero scores check**: se >80% dos `diagRows` têm `your_score === 0` E `top_1 === 0`
- Se qualquer regra disparar, `throw new Error('Invalid diagnostic data format')`

### 2. Frontend catch em `RoxCoachExtractor.tsx`

No `generateDiagnostic`, capturar o erro `'Invalid diagnostic data format'` e exibir toast: `'Diagnóstico detalhado indisponível para esta prova.'` sem salvar nada.

### 3. Nova chamada na Edge Function `proxy-roxcoach`

Mudar o contrato: em vez de receber `{ url }`, receber `{ athlete_name, event_name, division, season_id, result_url }`. A edge function constrói a chamada à API externa com query parameters:

```
GET https://api-outlier.onrender.com/diagnostico?athlete_name=...&event_name=...&division=...&season_id=...&result_url=...
```

Isso delega a inteligência de resolução de URL para o backend Python.

### 4. Frontend `RoxCoachExtractor.tsx` — remover `buildRoxCoachUrl`

- Remover a função `buildRoxCoachUrl` e `toSlug`
- Em `generateDiagnostic`, enviar o objeto `SearchResult` inteiro para o proxy:
  ```ts
  await supabase.functions.invoke('proxy-roxcoach', {
    body: {
      athlete_name: result.athlete_name,
      event_name: result.event_name,
      division: result.division,
      season_id: result.season_id,
      result_url: result.result_url,
    },
  });
  ```
- O `source_url` salvo no banco passa a ser `result.result_url` (URL original do HYROX)
- Atualizar a deduplicação para usar `result.result_url` em vez da URL RoxCoach construída

### Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `src/utils/diagnosticParser.ts` | Adicionar `validateDiagnosticData` com regras de rejeição |
| `src/components/RoxCoachExtractor.tsx` | Remover `buildRoxCoachUrl`/`toSlug`, enviar dados de contexto ao proxy, tratar erro de validação |
| `supabase/functions/proxy-roxcoach/index.ts` | Aceitar campos de contexto e montar query params para a API externa |

