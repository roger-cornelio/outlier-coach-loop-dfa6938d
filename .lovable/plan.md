

## Análise e Comparação de Simulados — Plano Final

### Resumo
Criar tela de comparação de simulados com dois seletores, tabela de deltas, diagnóstico Coach Outlier via edge function, e cache para modo individual. Inclui os 3 refinamentos solicitados.

### 1. Migration: Adicionar coluna `coach_insights` na tabela `simulations`

```sql
ALTER TABLE public.simulations ADD COLUMN coach_insights text;
```

Coluna nullable text para cache do diagnóstico individual.

### 2. Nova Edge Function: `generate-simulado-comparison/index.ts`

- Usa `LOVABLE_API_KEY` + Lovable AI Gateway (`google/gemini-2.5-flash`)
- Aceita body com `simulado_a` e opcionalmente `simulado_b` (splits + tempos + division)
- System prompt: Coach Outlier conforme especificado (VEREDITO/DIVIDENDOS/ALERTAS/DIRETRIZ para 2 simulados; análise individual para 1)
- Tratamento de 429/402 com mensagens amigáveis
- Sem menção a "IA" em nenhuma resposta visível
- Registrar em `supabase/config.toml` com `verify_jwt = false`

### 3. Novo componente: `SimuladosComparisonView.tsx`

**Props**: `simulations: SimulationRecord[]`, `onBack: () => void`

**UI**:
- Dois `<Select>`: "Simulado Base (A)" e "Simulado Comparativo (B)" (opcional)
- Label de cada option: `{division} — {dd/MM/yyyy} — {formatTime(total_time)}`

**Refinamento 1 — Auto-seleção cronológica**:
- Ao montar, A = simulado mais antigo (`created_at` menor), B = mais recente
- Se há apenas 1 simulado, A = esse, B = vazio (modo individual)

**Refinamento 2 — Alinhamento por label (não por index)**:
- Criar mapa `Map<string, SplitData>` por `split.label` para cada simulado
- Union de todas as labels para gerar as linhas da tabela
- Se uma label existe em A mas não em B (ou vice-versa), mostrar `—` na coluna faltante
- Delta calculado apenas quando ambos existem

**Tabela de comparação**:
- Colunas: `# | Fase | Tempo A | Tempo B | Δ`
- Δ = `timeB - timeA`. Verde se negativo (melhorou), vermelho se positivo (piorou)
- Linha final: Total e Roxzone com mesma lógica

**Botão de análise**: "✨ Gerar Diagnóstico de Evolução"
- Loading: Skeleton
- Resultado: `react-markdown` com `h3` em `text-orange-500`, bold em `text-orange-400`

**Refinamento 3 — Cache individual**:
- Se modo individual (só A) e `simA.coach_insights` já existe, renderizar direto sem chamar API
- Após gerar, salvar em `simulations.coach_insights` via `supabase.from('simulations').update()`
- Em modo comparação (A+B), sempre chamar API (sem cache)

### 4. Alteração em `SimulatorScreen.tsx`

- Adicionar `'compare'` ao `ViewState`
- Botão "Comparar Simulados" abaixo da lista (visível se `simulations.length >= 1`)
- Quando `viewState === 'compare'`, renderizar `<SimuladosComparisonView>`
- Botão voltar para lista

### 5. Config

Adicionar em `supabase/config.toml`:
```toml
[functions.generate-simulado-comparison]
verify_jwt = false
```

### Arquivos modificados/criados
- `supabase/migrations/xxx.sql` (ADD COLUMN coach_insights)
- `supabase/functions/generate-simulado-comparison/index.ts` (novo)
- `src/components/simulator/SimuladosComparisonView.tsx` (novo)
- `src/components/simulator/SimulatorScreen.tsx` (adicionar viewState compare)
- `supabase/config.toml` (registrar function)

