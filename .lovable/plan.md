

## Plano: Diagnóstico Gratuito com RoxCoach sem Autenticação

### Alterações

**1. Edge Function `proxy-roxcoach`** — Tornar auth opcional
- Se tiver header Authorization, valida e identifica o usuário
- Se não tiver, permite a chamada como anônima
- Sem rate limiting nesta fase
- Manter todo o resto da lógica (retry, normalização de nome, timeout)

**2. Página `DiagnosticoGratuito.tsx`** — Chamar RoxCoach
- Na função handleSelectResult, adicionar chamada ao proxy-roxcoach em paralelo
- Usar os dados top_1 do RoxCoach como "Meta OUTLIER" no diagnóstico
- Se o RoxCoach falhar: exibir mensagem "Diagnóstico temporariamente indisponível" na seção de análise comparativa (splits e tempo total continuam visíveis)
- Salvar resultado no localStorage para persistência futura quando criar conta
- Sem fallback para benchmarks internos

**3. Componente `ImprovementTable.tsx`** — Reverter override de p10_sec
- Remover o useEffect que busca percentile_bands e sobrescreve top_1
- Remover estado p10Map
- Usar dados originais de diagnostico_melhoria (fonte RoxCoach)

### Arquivos afetados
1. `supabase/functions/proxy-roxcoach/index.ts`
2. `src/pages/DiagnosticoGratuito.tsx`
3. `src/components/diagnostico/ImprovementTable.tsx`

### Risco de falha estimado: 2-3%
- Render pago elimina cold starts (era ~40% do risco)
- Retry automático já existe (2 tentativas com 3s de intervalo)
- Normalização de nomes já cobre "Sobrenome, Nome" → "Nome Sobrenome"
- Timeout de 55s é generoso para API respondendo sem cold start

### O que NÃO muda
- Edge functions de scraping e percentis
- Schema do banco (zero migrations)
- Fluxo de criação de conta

