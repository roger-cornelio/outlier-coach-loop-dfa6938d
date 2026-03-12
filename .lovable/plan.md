

## Modelo Híbrido: Coach Insights via IA para "Análise última prova"

### Contexto Atual
Os blocos Vermelho (Limitador), Verde (Ganho Potencial) e Laranja (Próximo Passo) em `DiagnosticRadarBlock.tsx` (linhas 2193-2218) usam textos genéricos como "Abaixo de X% da categoria" e "Zona competitiva superior da categoria". A matemática (qual estação é o limitador) já está correta via `mainLimiter` — falta apenas a "alma" textual.

### Problema com o modelo proposto
O prompt sugere `claude-3-5-sonnet-20241022`, que já está em uso na edge function `generate-diagnostic-ai` e funciona. Porém, como temos o Lovable AI Gateway disponível (já usado em `generate-deep-analysis`), recomendo usar esse gateway para evitar dependência direta da API Anthropic e manter consistência com o padrão mais recente do projeto.

### Plano de Implementação

**1. Migration: Adicionar coluna `coach_insights` (JSONB) em `diagnostico_resumo`**
- Cache da resposta da IA, chamando a API apenas 1x por prova

**2. Nova Edge Function: `generate-coach-insights`**
- Usa Lovable AI Gateway (modelo `google/gemini-2.5-flash`) — mesmo padrão do `generate-deep-analysis`
- Recebe: `athlete_name`, `main_limiter_name`, `splits` (JSON), `coach_style`
- System prompt: Head Coach de Elite, tom direto e tático, respeitando o coach style (IRON/PULSE/SPARK)
- Retorna JSON puro:
```json
{
  "limitador_descricao": "...",
  "ganho_acao": "...",
  "ganho_descricao": "...",
  "proximos_passos": ["...", "..."]
}
```

**3. Frontend: `DiagnosticRadarBlock.tsx`**
- Adicionar estado `coachInsights` + `loadingInsights`
- Ao montar com `hasData` e `mainLimiter`, verificar se `diagnostico_resumo` já tem `coach_insights` cacheado
- Se não tiver, chamar `generate-coach-insights` automaticamente e salvar no banco
- Nos 3 blocos (Vermelho, Verde, Laranja):
  - **Limitador**: trocar "Abaixo de X% da categoria" por `coachInsights.limitador_descricao`
  - **Ganho Potencial**: trocar "Corrigindo X → Zona competitiva..." por `coachInsights.ganho_acao` + `coachInsights.ganho_descricao`
  - **Próximo Passo**: manter `topStations` como fallback, mas adicionar `coachInsights.proximos_passos` quando disponível
- Fallback: textos genéricos atuais enquanto loading ou sem cache
- Zero mudanças visuais (cores, fontes, layout intocados)

**4. Também atualizar os textos da seção "Ver análise detalhada"** (linhas 2225-2243)
- Substituir o texto genérico "foi identificado como o principal fator limitante..." pelo `limitador_descricao` da IA
- Manter os dados numéricos (relativePerformance) como complemento

### Arquivos Modificados
- `supabase/functions/generate-coach-insights/index.ts` (novo)
- `supabase/config.toml` (registrar nova function)
- Migration SQL (nova coluna `coach_insights`)
- `src/components/DiagnosticRadarBlock.tsx` (injetar insights dinâmicos)

