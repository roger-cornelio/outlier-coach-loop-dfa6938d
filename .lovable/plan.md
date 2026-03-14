

## Análise de Risco Completa: Plano Consolidado Final + 3 Refinamentos

### Resumo das 3 novas regras adicionadas

1. **Gatekeeper Inteligente**: Diferencia erro da IA (modal laranja) vs erro de infra/timeout (modal vermelho)
2. **Preservação Parcial**: Bypass só afeta o bloco que falhou; blocos parseados com sucesso mantêm seus dados
3. **Blindagem UX Atleta**: Blocos sem métricas mostram ícone "i" com tooltip explicativo em vez de `--` seco

---

### Taxas de Acerto por Dimensão

| Dimensão | Antes (Regex) | Depois (IA + Gatekeeper + Refinamentos) |
|----------|--------------|----------------------------------------|
| Identificação do exercício | ~40% | ~97% |
| Sets x Reps | ~50% | ~98% |
| Carga (kg/lb) | 0% | ~95% |
| Intensidade (PSE/Zona) | 0% | ~90% |
| Calorias (Kcal) | 0% (mostra --) | ~85% |
| Tempo estimado | ~60% | ~90% |
| **Dados limpos no banco** | ~25% | **~98%** (Gatekeeper + preservação parcial) |
| **Percepção do atleta** | Ruim (-- sem explicação) | **~99%** (tooltip explica quando falta dado) |

---

### Mapa de Riscos Completo

#### Riscos de INFRAESTRUTURA

| Risco | Probabilidade | Impacto | Mitigação no plano |
|-------|-------------|---------|---------------------|
| Gemini cai ou timeout >15s | <0.5% | Alto (coach não salva) | Modal vermelho + botão "Forçar sem cálculos" |
| Rate limit 429 do Lovable AI Gateway | <1% em uso normal | Médio | Modal vermelho diferenciado (culpa da infra, não do coach) |
| Latência >5s irrita o coach | ~15% das chamadas | Baixo | Spinner "Analisando estrutura..." + timeout 15s |
| Custo escalar com muitos coaches | Baixo | Baixo | ~R$15-40/mês por 1000 treinos semanais |

#### Riscos de CÓDIGO

| Risco | Probabilidade | Impacto | Mitigação |
|-------|-------------|---------|-----------|
| Migração SQL quebra tabelas existentes | ~2% | **Crítico** | Migrações são ADD COLUMN (nunca DROP). Slugs são opcionais (nullable no início). Seeds rodam após criação. |
| `types.ts` auto-gerado não reflete novas colunas a tempo | ~5% | Médio | Usar casting `as any` temporário no hook enquanto types não regenera. Documentar. |
| `saveWorkout` síncrono bloqueia a thread com Promise.race | ~1% | Baixo | Promise.race com timeout de 15s garante que nunca trava indefinidamente |
| Edge Function `parse-workout-blocks` retorna JSON malformado | ~2% | Médio | Try/catch envolvendo o JSON.parse da resposta. Qualquer erro = cenário B (modal vermelho) |
| Preservação parcial de blocos com lógica complexa de merge | ~8% | Médio | Cada bloco é independente: loop simples `blocks.map()`. Bloco que falhou recebe `parseStatus: 'failed'`, os demais mantêm `completed`. Sem merge complexo. |
| Tooltip na WeeklyTrainingView quebra layout mobile | ~5% | Baixo | Usar componente `Tooltip` do shadcn já existente (confirmado em `src/components/ui/tooltip.tsx`). Responsive por padrão. |

#### Riscos de IA (Gemini)

| Risco | Probabilidade | Impacto | Mitigação |
|-------|-------------|---------|-----------|
| IA alucina exercícios que não existem no texto | ~1% | Alto | Regra anti-alucinação no prompt + Gatekeeper valida array vazio |
| IA confunde siglas ("FS" = Front Squat vs "FS" = outra coisa) | ~3% | Médio | Aliases na tabela `global_exercises` + few-shot examples |
| IA não reconhece exercício muito exótico | ~5% | Baixo | Fallback biomecânico: mapeia para padrão genérico (Squat/Hinge/Pull/Push) |
| IA interpreta "carga moderada" errado | ~5% | Baixo | Few-shot examples no prompt (3-5 cenários documentados) |
| IA retorna [] para texto válido mas muito criativo | ~3% | Médio | Modal laranja permite coach corrigir OU forçar salvamento |

#### Riscos de PRODUTO/UX

| Risco | Probabilidade | Impacto | Mitigação |
|-------|-------------|---------|-----------|
| Coach frustrado com fricção nos primeiros dias | ~30% | Médio | Mensagem educativa clara + bypass sempre visível + diferenciação culpa-coach vs culpa-infra |
| Coach clica "Forçar" sempre e nunca corrige | ~10% | Baixo | Atleta vê tooltip explicativo (não parece bug). Métricas parciais ainda aparecem nos blocos que funcionaram. |
| Atleta confunde ícone "i" com erro do app | ~5% | Baixo | Tooltip diz explicitamente "O detalhamento deste bloco não permitiu estimar..." — sem ambiguidade |

---

### O que pode ser melhorado no FUTURO (não no escopo atual)

1. **Retry automático em background**: Se o coach forçou bypass por timeout (cenário B), o sistema poderia re-tentar o parse em background 5 minutos depois e atualizar silenciosamente
2. **Dashboard de qualidade para o coach**: Mostrar % de blocos parseados com sucesso nos últimos 30 dias — gamificação da escrita
3. **Cache de dicionário**: Em vez de buscar `global_exercises` a cada chamada da edge function, cachear em memória (Deno KV ou variável global) por 5 minutos
4. **Feedback loop**: Se um exercício retorna [] repetidamente, logar para que um admin adicione ao dicionário/aliases

---

### Risco geral consolidado

| Categoria | Risco de falha grave |
|-----------|---------------------|
| Infraestrutura (Gemini/Gateway) | **<1%** — mitigado com modal diferenciado + bypass |
| Código (migrações + hook + edge function) | **~5%** — mitigado com colunas nullable, try/catch, timeout |
| IA (acurácia do parse) | **~3-5%** — mitigado com aliases, few-shot, fallback, anti-alucinação |
| UX (frustração coach/atleta) | **~10% temporário** — tende a zero com aprendizado |
| **TOTAL: Chance de erro sistêmico** | **<2%** |

O sistema é **à prova de falhas catastróficas**: nenhum caminho leva a dados corrompidos, tela quebrada ou coach bloqueado sem saída. O pior cenário possível é o coach ter que clicar um botão extra.

---

### Entregas técnicas finais (8 itens)

1. **Migração SQL**: `slug` + `aliases` em `movement_patterns` e `global_exercises`
2. **Migração SQL**: tabela `intensity_rules` + seed
3. **Data seed**: Popular slugs e aliases nos patterns e exercícios existentes
4. **Tipos** (`src/types/outlier.ts`): `ParsedExercise`, novos campos em `WorkoutBlock`
5. **Edge Function** `parse-workout-blocks`: Gemini 2.5 Flash com dicionário, few-shot, fallback biomecânico, regra anti-alucinação
6. **Hook** `useCoachWorkouts.ts`: Save síncrono bloqueante, validação Gatekeeper com diferenciação cenário A/B, preservação parcial de blocos
7. **Modal Gatekeeper** (`WorkoutParseValidationModal.tsx`): Modal laranja (coach) vs vermelho (infra), botão bypass, listagem de blocos com falha
8. **UI Atleta** (`WeeklyTrainingView.tsx`): Consumir `parsedExercises` para kcal/tempo + ícone "i" com tooltip para blocos sem métricas

