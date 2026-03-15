## Plano Consolidado Final: Parser IA com Gatekeeper Rigoroso

### Status: ✅ FASE 1 + FASE 2 + FASE 2.5 (BLINDAGEM) + FASE 2.6 (MEMOIZAÇÃO) IMPLEMENTADAS

---

### Fase 1 (Infraestrutura) ✅

1. ✅ **Migração SQL**: `slug` (unique) + `aliases` (text[]) em `movement_patterns` e `global_exercises` com índices GIN
2. ✅ **Migração SQL**: tabela `intensity_rules` com RLS + seed (PSE 6-10, Zonas 1-5)
3. ✅ **Data seed**: Slugs e aliases populados em 17 movement_patterns e 43 global_exercises
4. ✅ **Tipos** (`src/types/outlier.ts`): `ParsedExercise`, `ComputedBlockMetrics`, campos `parsedExercises`, `computedMetrics`, `parseStatus`, `parsedAt` em `WorkoutBlock`
5. ✅ **Edge Function** `parse-workout-blocks`: Gemini 2.5 Flash via Lovable AI Gateway com dicionário dinâmico, tool calling, few-shot, anti-alucinação

### Fase 2 (Integração) ✅

6. ✅ **Hook** `useCoachWorkouts.ts`: Save síncrono bloqueante + Gatekeeper (cenário A/B) + preservação parcial + `forceSaveWorkout` + `gatekeeperResult` state
7. ✅ **Modal Gatekeeper** (`WorkoutParseValidationModal.tsx`): Modal laranja (coach) vs vermelho (infra), bypass consciente
8. ✅ **Integração** `CoachSpreadsheetTab.tsx`: Modal wired ao fluxo de save, com `pendingGatekeeperSave` para retry/bypass
9. ✅ **Utilitário** `computeBlockKcalFromParsed.ts`: Motor de cálculo de kcal/tempo usando fórmulas biomecânicas (vertical_work, horizontal_friction, metabolic) + multiplicadores de intensidade
10. ✅ **UI Atleta** (`WeeklyTrainingView.tsx`): Prioriza `parsedExercises` para kcal/tempo real, fallback para estimativas legadas, ícone "i" com tooltip para blocos sem métricas

### Fase 2.5 (Blindagem Anti-Freeze) ✅

11. ✅ **Web Worker** (`src/workers/structuredParser.worker.ts`): Parser isolado em thread separada — UI nunca congela
12. ✅ **TextModelImporter.tsx**: Worker com timeout de 8s + `worker.terminate()` + `try/finally` consistente + toast de erro no save falho
13. ✅ **useCoachWorkouts.ts**: Catch mapeia exceções inesperadas para `gatekeeperResult { errorType: 'infra_failure' }` — modal vermelho sempre abre
14. ✅ **CoachSpreadsheetTab.tsx**: `onForceBypass` envolvido em `try/finally` — `isSavingToDb` nunca fica travado
15. ✅ **CORS Edge Function**: Já correto (headers extendidos incluindo `x-supabase-client-*`) — sem alteração necessária

### Fase 2.6 (Memoização — Eliminação de Redundância) ✅

16. ✅ **Cache unitDetection.ts**: `_unitsCache` Map + `resetUnitsCache()` — `detectUnits()` retorna O(1) para linhas já analisadas
17. ✅ **Caches structuredTextParser.ts**: 5 Maps (`_narrativeCache`, `_measurableCache`, `_trainingCache`, `_prescriptionCache`, `_headingCache`) + `resetParserCaches()`
18. ✅ **Funções memoizadas**: `isNarrativeLine`, `hasMeasurableStimulus`, `isTrainingStimulus`, `isPrescriptionLine`, `isHeadingLine` — todas com cache lookup/store
19. ✅ **`isHeadingLineInLoop`**: Versão otimizada que pula checagens de rest/optional/restCandidate (já descartadas pelo loop principal via `continue`)
20. ✅ **Reset global**: `parseStructuredText()` chama `resetUnitsCache()` + `resetParserCaches()` na primeira linha — zero vazamento entre sessões
21. ✅ **Impacto**: Redução estimada de ~75% nas execuções de regex (40.000 → ~10.000 para 200 linhas). Zero mudança funcional.

### Arquitetura do Fluxo

```
Coach clica "Validar" → Web Worker (thread separada) → timeout 15s
  ├── Sucesso → Exibe resultado parseado ✅
  └── Timeout/Erro → UI destrava + erro amigável ✅

Coach clica "Salvar" → UI trava (loading) → Edge Function parse-workout-blocks (Gemini 2.5 Flash)
  ├── Sucesso → Salva no banco com parsedExercises enriquecidos ✅
  └── Falha → Modal Gatekeeper
       ├── Cenário A (laranja): "Texto não reconhecido" → Coach corrige ou força bypass
       └── Cenário B (vermelho): "Motor indisponível" → Coach tenta novamente ou força bypass
            └── Bypass → try/finally garante isSavingToDb resetado ✅
```

### Performance do Parser Local (Fase 2.6)

```
Linha "10 Burpees" → 1ª chamada: ~30 regex executados → resultado salvo no cache
                   → 2ª-5ª chamada: O(1) lookup no Map → resultado retornado instantaneamente
                   
Reset automático no início de cada parseStructuredText() → sem vazamento de memória
```

### Próximos passos opcionais (Fase 3):
- Retry automático em background para blocos bypassed
- Dashboard de qualidade de escrita do coach
- Cache de dicionário na edge function (Deno KV)
- Feedback loop para exercícios não reconhecidos

### Fase 3: Refatoração UI/UX Dashboard + Integridade de Dados ✅

**Frente 1 — Integridade de Dados** ✅
- Removido `METRIC_INSIGHTS` (mock hardcoded com textos falsos como "-1m45 vs Elite")
- Expandida query de `diagMelhorias` para incluir `movement` e `metric`
- Gap real formatado dinamicamente: `↓ 45s` (< 60s), `↓ 01:15` (≥ 60s), `✓ Meta batida` (sem gap)
- Sem referências a "vs Elite" (anti-metalinguagem)

**Frente 2 — Estrelas com cor única** ✅
- `percentileToStars` simplificado: retorna apenas `{ count }`, sem `colorClass`
- `StarRating` usa `text-primary` para preenchidas, `text-muted-foreground/20` para vazias
- Layout `justify-between` com gap alinhado à direita em `tabular-nums`

**Frente 3 — Gráfico de Barras** ✅
- Altura aumentada de `h-2.5` para `h-4`
- Data labels: tempo real (`raw_time_sec` formatado MM:SS) como label principal, percentil como fallback
- Empty state: barra fantasma `bg-muted/5` com traço "—" (sem texto "Sem dados")
- Bordas arredondadas `rounded-r-md`

**Frente 4 — Blocos Textuais** ✅
- Cores semânticas mantidas (vermelho/verde/âmbar)
- Padding aumentado de `p-4` para `p-5`
- Título do limitador: `text-lg font-bold`
- Textos descritivos: `leading-relaxed` + `mt-1.5`
- Espaçamento entre cards: `space-y-4`
- Próximos passos: `leading-relaxed` + `text-foreground/90`

### Fase 4: Perfil Fisiológico Determinístico ✅

**Objetivo**: Eliminar alucinações matemáticas do LLM — todo cálculo clínico é feito em TypeScript na Edge Function.

**Passo 1 — Migração SQL** ✅
- Coluna `perfil_fisiologico JSONB DEFAULT NULL` adicionada em `diagnostico_resumo`
- Política de UPDATE para `authenticated` WHERE `auth.uid() = atleta_id`

**Passo 2 — Edge Function `generate-deep-analysis`** ✅
- Supabase Service Role Client para queries privilegiadas
- Busca `sexo` e `peso` em `profiles` via `atleta_id`; retorna HTTP 400 se `sexo` null
- Dicionário estrito split_name → metric (`'Ski Erg'→ski`, `'Rowing'→row`, etc.)
- Mapeamento de division (`Open→HYROX`, `Pro→HYROX PRO`) + gender derivado do sexo
- **Velocidade Crítica (CS)**: Média das velocidades (1000/sec) dos últimos 3 Running splits
- **VO2max (Dexheimer 2020)**: `Math.round((8.449 * CS) + (4.387 * sexo_num) + 14.683)`
- **Limiar de Lactato**: `1000 / CS` → formato MM:SS
- **Radar 6 eixos (0-100)**: Score = `clamp(0, 100, 100 - ((atleta - p10) / (p90 - p10)) * 100)`
  - Cardio: run_avg, ski, row
  - Força: sled_push, sled_pull
  - Potência: wallballs, bbj
  - Core: sandbag, farmers
  - Anaeróbica: roxzone (exclusivo)
  - Eficiência: `100 - clamp(0,100, (abs(run8-run1)/run1)*100)`
- Injeção no System Prompt como fatos imutáveis (bloco `PERFIL FISIOLÓGICO PRÉ-CALCULADO`)
- Resposta expandida: `{ texto, perfil_fisiologico: { vo2_max, limiar_lactato, radar } }`

**Passo 3 — Frontend `DeepAnalysisBlock.tsx`** ✅
- Payload envia `atleta_id` (obtido via `supabase.auth.getUser()`)
- Tratamento de erro 400 (`MISSING_SEX`) com toast orientando a preencher configurações
- Cache expandido: `.update({ texto_ia_completo, perfil_fisiologico })` no `diagnostico_resumo`
- Estado inicial lê `resumo.perfil_fisiologico` e `resumo.texto_ia_completo`

**Arquitetura do Fluxo**
```
Atleta clica "Gerar Raio X"
  → Edge Function recebe atleta_id + splits + diagnosticos
  → Service Role busca profiles.sexo/peso + percentile_bands
  → TypeScript calcula CS, VO2max, Limiar, Radar (determinístico)
  → Valores injetados no System Prompt como fatos imutáveis
  → LLM gera texto interpretativo (nunca calcula números)
  → Retorna { texto, perfil_fisiologico }
  → Frontend cacheia ambos no diagnostico_resumo
```
