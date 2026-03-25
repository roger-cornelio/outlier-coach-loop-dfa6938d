

## Parecer IA + Percentis Corrigidos no Diagnóstico Gratuito

### Problema atual

1. **Parecer hardcoded** — O texto do "Parecer OUTLIER" no diagnóstico gratuito é um template estático com frases fixas. No diagnóstico de evolução (ImportarProva), o mesmo bloco usa a Edge Function `generate-diagnostic-ai` que gera texto personalizado com IA (análise de gargalo, pace, prescrição).

2. **Percentis imprecisos** — As frases "top X%" e "X% dos atletas são mais rápidos" usam `scores[].percentile_value` (percentis internos do `calculate-hyrox-percentiles`), mas deveriam usar os dados do RoxCoach (`roxCoachDiagnosticos`) que são a mesma fonte de verdade usada na tabela "Onde Focar".

### O que será feito

**1. Chamar a IA para gerar o Parecer** (`src/pages/DiagnosticoGratuito.tsx`)

- Após receber os dados do scrape + RoxCoach + percentis, chamar `generate-diagnostic-ai` com os mesmos parâmetros que `ImportarProva.tsx` usa (athlete_name, event_name, division, finish_time, splits_data, diagnostic_data)
- Coach style fixo `'PULSE'` (diagnóstico gratuito não tem seleção de coach)
- Guardar o `texto_ia` em um novo state
- A chamada será não-bloqueante: o resultado aparece assim que disponível, sem travar a renderização dos demais blocos

**2. Renderizar o texto IA no Parecer** (`src/pages/DiagnosticoGratuito.tsx`)

- Quando `texto_ia` estiver disponível, substituir o bloco de template estático (linhas 696-752) pelo componente de Markdown igual ao `ParecerPremium.tsx` (com `ReactMarkdown` e os mesmos estilos de `h3`, `p`, `strong`, `ul`, `li`)
- Enquanto carrega, mostrar um skeleton/loading sutil dentro do card
- Fallback: se a IA falhar, manter o template atual como estava

**3. Corrigir os percentis nas frases narrativas** (`src/pages/DiagnosticoGratuito.tsx`)

- **"top X%"**: Usar o percentil do RoxCoach quando disponível. O RoxCoach retorna `percentage` por estação — calcular a média geral ou usar o percentil do finish time total
- **"X% dos atletas são mais rápidos"**: Para o gargalo (weakStations[0]), usar `weakStations[0].percentage` do RoxCoach em vez de `100 - weakStations[0].percentile_value`
- Fallback: manter o cálculo atual de `scores` quando RoxCoach não tem dados

### Arquivos modificados

- `src/pages/DiagnosticoGratuito.tsx` — adicionar state `textoIa`, chamada à edge function, renderização condicional com ReactMarkdown, correção dos percentis

### O que NÃO muda

- Edge function `generate-diagnostic-ai` — já funciona, sem alterações
- Layout geral da tela (hero, tabela Onde Focar, fadiga, plano de ataque)
- Lógica de busca e scrape

