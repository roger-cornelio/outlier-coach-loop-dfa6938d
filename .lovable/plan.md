

## Fix: Ordenação cronológica de provas HYROX

### Problema
O `source_index` (baseado na posição do evento na lista do site HYROX) não é cronológico. Além disso, `event_date` é salvo como `YYYY-01-01` (placeholder), tornando o fallback por data inútil. Resultado: a prova errada é marcada como "mais recente".

### Mudanças

**1. `supabase/functions/scrape-hyrox-result/index.ts`**
- Adicionar instrução ao prompt da IA para extrair a **data completa do evento** (YYYY-MM-DD) do HTML
- Adicionar campo `event_date` no schema da tool call (tipo string, formato YYYY-MM-DD)
- O campo já será retornado no JSON de resposta sem mudanças adicionais

**2. `src/components/ProvasTab.tsx` (linha 234)**
- Trocar `event_date: '${eventYear}-01-01'` por `event_date: scrapeData.event_date || '${eventYear}-06-15'`
- Fallback para meio do ano em vez de 01-01 (evita confusão com placeholder)

**3. `src/components/DiagnosticRadarBlock.tsx`** 
- Já usa `scrapeData.event_date || '${eventYear}-06-15'` — sem mudanças necessárias

**4. `src/components/BenchmarkHistory.tsx` (linhas 142-155)**
- Nova lógica de sort com 4 níveis:
  1. Se ambos têm data real (não-placeholder `YYYY-01-01`): ordenar por data DESC
  2. Data real vence placeholder
  3. Ambos placeholder: usar `source_index` DESC
  4. Fallback: `created_at` DESC
- Helper inline: `isPlaceholderDate(d)` detecta padrão `YYYY-01-01`

### Resultado
- Provas novas terão data real extraída do HTML → ordenação correta
- Provas já importadas (com `YYYY-01-01`) continuam usando `source_index` como fallback
- A prova cronologicamente mais recente será corretamente marcada como validadora de nível

