

## Plano: Corrigir Fluxo de Importação de Diagnóstico via RoxCoachExtractor

### Problema atual

1. **`RoxCoachExtractor` é um componente órfão** — não está importado em nenhum lugar do app. O `RoxCoachDashboard` (aba Diagnóstico) não o utiliza.
2. **Não salva `diagnostico_resumo`** — só salva `diagnostico_melhoria` e `tempos_splits`, mas o dashboard precisa dos 3.
3. **Não usa o parser compartilhado** (`parseDiagnosticResponse` de `diagnosticParser.ts`) — tem lógica duplicada e menos robusta.
4. **Sem fallback** — quando `proxy-roxcoach` retorna erro 500 (API externa instável), falha completamente.
5. **Não toca em `benchmark_results`** — isso já está correto, mas precisa ser mantido.

### Separação de responsabilidades (conforme solicitado)

| Fonte | O que salva | Onde salva |
|-------|------------|------------|
| `proxy-roxcoach` (RoxCoach) | Diagnóstico tratado (resumo, melhorias, splits) | `diagnostico_resumo`, `diagnostico_melhoria`, `tempos_splits` |
| `scrape-hyrox-result` (HYROX.com) | Print da prova (tempo total, evento, splits crus) | `benchmark_results`, `race_results` |
| RoxCoachExtractor | **Só diagnóstico** | **Nunca** salva em `benchmark_results` |

### Mudanças

#### 1. Refatorar `RoxCoachExtractor.tsx`
- Remover toda a lógica duplicada de parsing (funções `parsePotentialImprovement`, `findValue`, `toNum`, etc.)
- Usar `parseDiagnosticResponse` e `hasDiagnosticData` do `diagnosticParser.ts` (mesmo padrão do `ImportarProva`)
- Salvar nos 3 tabelas: `diagnostico_resumo` + `diagnostico_melhoria` + `tempos_splits`
- **Não salvar nada** em `benchmark_results`
- Adicionar `.catch()` no `proxy-roxcoach` para não crashar quando a API externa falhar
- Passar a `source_url` do resultado para o parser

#### 2. Integrar `RoxCoachExtractor` no `RoxCoachDashboard`
- Quando não há dados de diagnóstico (`!hasData`), renderizar o `RoxCoachExtractor` como tela de importação
- No `onSuccess`, incrementar o `refreshKey` para recarregar os dados do dashboard
- Isso conecta o componente órfão ao fluxo real do app

#### 3. Garantir que `ImportarProva` mantenha o comportamento correto
- Já salva em `benchmark_results` (resultado da prova) — manter
- Já chama `proxy-roxcoach` em paralelo com fallback `.catch()` — manter
- Já salva diagnóstico via `saveDiagnosticData` — manter
- Nenhuma mudança necessária neste arquivo

### Arquivos alterados
- `src/components/RoxCoachExtractor.tsx` — refatorar para usar `parseDiagnosticResponse`, salvar `diagnostico_resumo`, remover código duplicado
- `src/components/RoxCoachDashboard.tsx` — importar e renderizar `RoxCoachExtractor` quando não há dados

