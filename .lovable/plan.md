

## Plano: Aplicar Multiplicadores de Adaptação no Publish

### Problema

O step "Adaptação" já existe visualmente no modal de publicação (step 2 do wizard de 3 steps). O coach vê os chips coloridos (Wall Balls +15%, SkiErg -10%) e pode ligar/desligar por atleta. Porém, quando clica "Publicar", o sistema ignora completamente esses ajustes — publica o treino original idêntico para todos.

### O que será feito

Conectar os multiplicadores de ênfase ao fluxo de publicação, de forma que atletas com adaptação ativada recebam o treino com volume ajustado.

### Arquivos alterados

**1. `src/utils/diagnosticProportionEngine.ts`** — Nova função `applyEmphasisToWorkouts`
- Recebe os workouts originais e o array de `StationEmphasis`
- Para cada bloco, identifica a estação HYROX correspondente (matching pelo tipo do bloco + conteúdo)
- Aplica o multiplicador nos campos numéricos: `reps`, `distanceMeters`, `sets`, `durationSeconds` dos `parsedExercises`
- Atualiza o texto do `content` com os valores ajustados
- Retorna um novo array de workouts (sem mutar o original)
- Regras de proteção: nunca altera exercícios de força (%1RM), nunca remove exercícios, apenas ajusta volume

**2. `src/components/PublishToAthletesModal.tsx`** — Integrar no `handlePublish`
- Antes de montar o payload de cada atleta, verificar se `athleteAdaptations.get(athleteId)?.enabled === true`
- Se sim, chamar `applyEmphasisToWorkouts(workouts, emphasis)` e usar o resultado adaptado
- Se não, publicar o treino original
- No step de confirmação, mostrar resumo: "X atletas com adaptação ativa, Y sem adaptação"
- Adicionar metadata `adaptation_applied: true/false` e `emphasis_snapshot` no `plan_json` para auditoria

### Como funciona o matching estação → bloco

O engine resolve a estação pelo nome do exercício/movimento dentro do bloco:
- Bloco tipo `corrida` → match com "running/corrida"
- Bloco com "wall ball" no conteúdo → match com "wall balls"
- Bloco com "sled push" → match com "sled push"
- Blocos sem match (aquecimento, mobilidade) → multiplicador 1.0 (sem alteração)

### O que o coach vê

No step "Adaptação" (já existente):
- Chips coloridos com ajustes por estação (já funciona)
- Toggle por atleta (já funciona)

No step "Confirmar" (melhoria):
- Novo resumo: "3 atletas com adaptação ativa" / "2 atletas sem adaptação"
- Badge visual diferenciando atletas adaptados vs. não adaptados

### Proteções

- Multiplicadores limitados a 0.85x–1.15x (já garantido pelo engine)
- Volume total neutro (soma dos multiplicadores ≈ N)
- Treino original preservado no campo `original_workouts` do `plan_json` para rollback
- Blocos de aquecimento e mobilidade nunca são alterados

### Sequência

1. Criar `applyEmphasisToWorkouts` no engine
2. Integrar no `handlePublish` com verificação do toggle
3. Adicionar resumo de adaptação no step de confirmação
4. Persistir metadata de auditoria no `plan_json`

