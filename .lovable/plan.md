

# Melhoria dos Prompts de Diagnóstico — 3 Edge Functions

## Alterações por Arquivo

### 1. `supabase/functions/generate-deep-analysis/index.ts`
- **DIRETRIZES**: Adicionar regra estrita de formatação MM:SS/HH:MM:SS (proibir segundos brutos)
- **Seção "Gargalos Críticos"**: Trocar "Top 1%" por "percentil imediatamente acima" (ex: Top 40% → alvo Top 20%)
- **Nova seção obrigatória** `### 🏃 ANÁLISE DE PACE`: calcular pace médio (Running Total ÷ 8km), propor pace alvo para o percentil acima, criticar variação de splits de corrida e instruir estratégia de pace constante
- **max_tokens**: 1500 → 2000

### 2. `supabase/functions/generate-diagnostic-ai/index.ts`
- **DIRETRIZES**: Mesma regra de formatação MM:SS
- **Seção "LEITURA DA MÁQUINA"**: Trocar "Top 1%" por "percentil acima"
- **Seção "GARGALO TÁTICO"**: Adicionar instrução de pace médio e pace constante
- **Seção "PRESCRIÇÃO"**: Incluir pace alvo como uma das diretrizes

### 3. `supabase/functions/generate-coach-insights/index.ts`
- **DIRETRIZES**: Adicionar regra de formatação MM:SS
- **Prompt**: Trocar referência "Top 1%" por percentil realista de evolução gradual

## O que NÃO muda
- Zero alteração em tabelas, tipos, front-end ou estrutura JSON de resposta
- Modelos de IA permanecem os mesmos (Gemini Flash e Claude)
- CORS e error handling intocados

