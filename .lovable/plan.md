
Diagnóstico rápido: o texto “time e time” não está vindo da IA; ele está vindo do fallback determinístico.

1) Causa principal (dados)
- A tabela `diagnostico_melhoria` está salvando `metric = "time"` para quase todas as linhas.
- Confirmei no banco: movimentos como “Run Total”, “Sandbag Lunges”, “Ski Erg” estão com `metric: "time"`.
- Isso vem do parser (`src/utils/diagnosticParser.ts`), que usa fallback `metric || "time"` quando o campo não vem da API.

2) Causa secundária (fluxo de fallback)
- A chamada para `generate-periodization-text` falhou no browser (`Failed to fetch` no request).
- Quando isso acontece, o componente cai no `deterministicFocus`.
- Esse fallback monta frase com `g.metric`; como a métrica é `"time"`, vira “time e time”.

3) Causa de persistência do erro
- Em `DiagnosticRadarBlock.tsx`, `periodizationFetched.current = true` é setado antes da chamada terminar.
- Se a primeira chamada falha, não há nova tentativa automática para esse ciclo de dados.

Plano de correção
- Corrigir na origem: normalizar `metric` no parser com base em `movement` (ex.: Run Total→`run_avg`, Sandbag Lunges→`sandbag`, Ski Erg→`ski`) em vez de cair em `"time"`.
- Corrigir no consumo: no fallback, priorizar métrica normalizada e, se não houver, usar `movement` (nunca exibir `"time"` para o atleta).
- Corrigir robustez: só marcar “fetched” após sucesso, e adicionar retry curto (1–2 tentativas) quando houver erro de rede.
- Melhorar geração IA: enviar `canonical_metric` + `movement_label` para reduzir ambiguidade no prompt.
- Se quiser mais qualidade de linguagem, trocar o modelo para `openai/gpt-5-mini` (mais próximo do que você pediu em estilo).

Se você aprovar, eu implemento exatamente esses 5 ajustes.
