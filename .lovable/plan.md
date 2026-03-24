

## Plano: Reaproveitar Dados do Diagnóstico Gratuito no Onboarding

### Resumo

Quando o atleta faz o diagnóstico gratuito e depois cria conta, os dados da prova já analisada são automaticamente salvos no banco — sem precisar buscar/importar de novo. A busca na aba Evolução continua funcionando normalmente para importar provas adicionais.

### Como funciona hoje

1. **Diagnóstico Gratuito** (`DiagnosticoGratuito.tsx`): busca nome → scrape da prova → calcula percentis via `public-calculate-percentiles` → mostra resultado → **descarta tudo** (nada salva)
2. **Onboarding** (`WelcomeScreen.tsx`): busca nome de novo → scrape de novo → chama `proxy-roxcoach` → salva em `diagnostico_resumo`, `diagnostico_melhoria`, `tempos_splits`, `benchmark_results`
3. **Evolução** (`EvolutionTab.tsx`): lê dos dados salvos no banco

### O que muda

**Passo 1 — Unificar cálculo de percentis (dry_run)**

Adicionar `dry_run: true` na edge function `calculate-hyrox-percentiles`:
- Pula JWT, pula busca em `benchmark_results`, pula insert em `hyrox_metric_scores`
- Retorna scores + `p10_sec` (mesma lógica, mesma tabela `percentile_bands`)

Atualizar `DiagnosticoGratuito.tsx` para chamar essa função unificada. Deletar `public-calculate-percentiles`.

**Passo 2 — Salvar dados no localStorage ao completar diagnóstico gratuito**

Após calcular os scores e mostrar o resultado, salvar em `localStorage` (chave `outlier_free_diagnostic`):
- `scores` (percentis + p10_sec)
- `scrapedData` (splits, time_in_seconds, event_name, race_category)
- `selectedResult` (athlete_name, division, result_url, season_id)
- `gender`
- `timestamp` (expira em 24h)

**Passo 3 — WelcomeScreen consome dados do localStorage**

Ao montar, verificar se existe `outlier_free_diagnostic` válido:
- **Se SIM**: pular a etapa de busca e ir direto para o step `congrats`. Em paralelo:
  - Chamar `proxy-roxcoach` com o contexto salvo para obter diagnóstico completo
  - Persistir em `diagnostico_resumo`, `diagnostico_melhoria`, `tempos_splits`
  - Persistir em `benchmark_results` (tempo total + splits)
  - Chamar `calculate-hyrox-percentiles` (sem dry_run, com JWT) para salvar em `hyrox_metric_scores`
  - Limpar localStorage após sucesso
- **Se NÃO**: fluxo normal (busca → importação), sem mudança nenhuma

**Passo 4 — Aba Evolução continua igual**

Nenhuma mudança. A busca para importar provas adicionais continua existindo no `ImportarProva.tsx` e no fluxo de benchmarks. A aba Evolução lê de `diagnostico_resumo` + `tempos_splits` que foram populados pelo WelcomeScreen (seja via localStorage ou busca manual).

### Arquivos afetados

1. `supabase/functions/calculate-hyrox-percentiles/index.ts` — branch `dry_run`
2. `src/pages/DiagnosticoGratuito.tsx` — trocar edge function + salvar localStorage
3. `src/components/WelcomeScreen.tsx` — detectar localStorage + persistir dados
4. `supabase/functions/public-calculate-percentiles/` — deletar

### O que NÃO muda

- Apresentação visual de nenhuma tela
- Busca de provas adicionais na aba Evolução / Importar Prova
- Schema do banco (zero migrations)
- Nenhum custo extra de API

