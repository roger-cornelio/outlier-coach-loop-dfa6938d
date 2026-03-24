

## Plano: Diagnóstico Gratuito com RoxCoach — IMPLEMENTADO ✅

### O que foi feito

**1. Edge Function `proxy-roxcoach`** — Auth agora é opcional ✅
- Se tiver header Authorization, valida e identifica o usuário
- Se não tiver, permite a chamada como anônima (userId = 'anonymous')
- Toda a lógica de retry, normalização de nome e timeout foi mantida

**2. Página `DiagnosticoGratuito.tsx`** — Integração com RoxCoach ✅
- `handleSelectResult` agora chama `scrape-hyrox-result` e `proxy-roxcoach` em paralelo
- Usa os dados `top_1` do RoxCoach como "Meta OUTLIER" no "Onde Focar"
- Se o RoxCoach falhar: exibe mensagem "Diagnóstico comparativo temporariamente indisponível"
- Splits e tempo total continuam visíveis mesmo em caso de falha
- Dados salvos no localStorage incluem dados do RoxCoach para persistência no onboarding

**3. Componente `ImprovementTable.tsx`** — Revertido para dados RoxCoach ✅
- Removido o useEffect que buscava percentile_bands e sobrescrevia top_1
- Removido estado p10Map e import do supabase client
- Usa dados originais de diagnostico_melhoria (fonte RoxCoach)

### Risco de falha estimado: 2-3%
- Render pago elimina cold starts
- Retry automático (2 tentativas com 3s de intervalo)
- Normalização de nomes cobre "Sobrenome, Nome" → "Nome Sobrenome"
- Timeout de 55s generoso
