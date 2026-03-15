

## Correção: Formatação de Tempo e Cálculo de Pace no Raio X

### Problema
1. A IA às vezes gera tempos no formato `00:MM:SS` (zeros na hora) para tempos < 1h
2. A análise de pace usa linguagem vaga ("aproximadamente X segundos") em vez de cálculos exatos

### Causa
O prompt do sistema já pede formatação MM:SS, mas não é explícito o suficiente sobre:
- Proibir o prefixo `00:` em tempos < 1 hora
- Obrigar o cálculo exato da defasagem de pace (passo a passo determinístico)

Além disso, o sistema não pré-calcula o pace e a defasagem para injetar no prompt — deixa tudo para a IA, que pode errar ou ser vaga.

### Solução

**Arquivo:** `supabase/functions/generate-deep-analysis/index.ts`

1. **Pré-calcular pace no servidor** (determinístico, antes de enviar à IA):
   - Pace médio do atleta = Run Total (soma dos 8 splits de corrida) ÷ 8 km → resultado em min/km
   - Pace alvo = buscar `run_avg` do `bandMap` (p10) e calcular o pace correspondente
   - Defasagem exata = pace atleta - pace alvo, em segundos

2. **Injetar bloco de pace pré-calculado** no prompt (junto ao `physioBlock`):
   ```
   PACE PRÉ-CALCULADO (NÃO RECALCULE):
   - Pace Médio Realizado: 05:14 min/km
   - Pace Alvo (Próximo Nível): 04:33 min/km  
   - Defasagem Exata: 41 segundos por km
   ```

3. **Reforçar regras de formatação** no prompt:
   - Adicionar regra explícita: "NUNCA use o formato 00:MM:SS. Para tempos menores que 1 hora, use APENAS MM:SS (ex: 05:28, não 00:05:28)"
   - Na seção de pace: "Use EXATAMENTE os valores pré-calculados. Escreva: 'pace médio defasado em exatos X segundos por quilômetro'"

4. **Pós-processamento do texto** gerado: regex para limpar qualquer `00:MM:SS` residual → `MM:SS`

### Detalhes técnicos

- O pace é calculado como `totalRunSec / 8` (8km total) → convertido para MM:SS
- O pace alvo usa `bandMap['run_avg'].p10` (melhor percentil) convertido para pace/km
- A limpeza pós-geração usa: `cleanText.replace(/\b00:(\d{2}:\d{2})\b/g, '$1')`

