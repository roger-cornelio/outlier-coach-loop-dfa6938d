

# Ajuste Fino dos Prompts — Anti-Metalinguagem, Ocultação de Cálculos e Anti-Truncamento

## 3 Problemas Identificados

1. **Metalinguagem**: A IA explica a metodologia ao atleta ("em vez do Top 1%, vamos usar o Top 20%")
2. **Cálculos expostos**: A IA mostra o passo a passo matemático ("2515 / 8 = 314.375s")
3. **Truncamento**: O texto do `generate-deep-analysis` é cortado por `max_tokens` insuficiente

## Alterações por Arquivo

### 1. `generate-deep-analysis/index.ts`
- **Seção REGRAS** — adicionar 3 novas regras:
  - **Anti-Metalinguagem**: "NUNCA explique a metodologia de comparação. Não mencione 'Top 1%', 'Elite' ou qualquer outro benchmark que não seja o próximo nível do atleta. Trate o percentil alvo como o ÚNICO referencial existente."
  - **No Math UI**: "NUNCA exiba fórmulas, conversões de segundos, frações ou passo a passo de cálculos. Entregue APENAS o resultado final formatado."
  - **Concisão**: "Seja cirúrgico e objetivo. Na seção de Gargalos, aprofunde APENAS nos 2-3 maiores. Para estações com defasagem insignificante, seja breve ou omita."
- **Seção BENCHMARKING** — reescrever sem mencionar "Top 1%": "Compare o atleta com o Próximo Nível Competitivo (percentil imediatamente acima). Este é o ÚNICO benchmark válido."
- **Seção ### 📉 Gargalos** — remover "(não Top 1%)"
- **User message** — remover "(não Top 1%)"
- **max_tokens**: 2000 → 4000
- Remover a linha de exemplo de conversão ("Para converter: divida os segundos por 60...")

### 2. `generate-diagnostic-ai/index.ts`
- **Seção REGRAS** — adicionar Anti-Metalinguagem e No Math UI (mesmas regras)
- **Seção BENCHMARKING** — reescrever sem "Top 1%", usar "Próximo Nível Competitivo"
- Remover linha de exemplo de conversão

### 3. `generate-coach-insights/index.ts`
- **Seção REGRAS** — adicionar Anti-Metalinguagem e No Math UI
- **Seção BENCHMARKING** — reescrever sem "Top 1%"
- Remover linha de exemplo de conversão

## O que NÃO muda
- Zero alteração em tabelas, front-end, tipos ou estrutura JSON
- Modelos de IA, CORS e error handling intocados
- Regras de formatação MM:SS e Pace permanecem

