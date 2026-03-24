

## Plano: Reaproveitar Dados do Diagnóstico Gratuito no Onboarding ✅ IMPLEMENTADO

### O que foi feito

1. **Edge function `calculate-hyrox-percentiles`** — adicionado modo `dry_run: true` que pula JWT, pula persistência no banco, e retorna scores com `p10_sec` (Meta OUTLIER). Mesma função `calculatePercentile`, mesma tabela `percentile_bands`.

2. **`DiagnosticoGratuito.tsx`** — trocou chamada de `public-calculate-percentiles` para `calculate-hyrox-percentiles` com `dry_run: true`. Após calcular, salva os dados em `localStorage` (chave `outlier_free_diagnostic`) com scores, scraped data, selected result, gender e timestamp (expira em 24h).

3. **`WelcomeScreen.tsx`** — ao montar, verifica se existe `outlier_free_diagnostic` válido no localStorage. Se sim:
   - Pula direto para o step `congrats`
   - Persiste dados no banco em background (diagnostico_resumo, diagnostico_melhoria, tempos_splits, race_results)
   - Chama `proxy-roxcoach` para obter diagnóstico completo
   - Limpa localStorage após sucesso

4. **`public-calculate-percentiles`** — deletada (redundante).

### O que NÃO mudou

- Apresentação visual de nenhuma tela
- Busca de provas adicionais na aba Evolução / Importar Prova
- Schema do banco (zero migrations)
- Fluxo para quem nunca fez diagnóstico gratuito
