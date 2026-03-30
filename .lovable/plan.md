

## Plano: Duas sessões no mesmo dia (Sessão 1 / Sessão 2)

### Modelo

Cada `DayWorkout` ganha um campo opcional `session?: number` (1 ou 2, default 1). Quando o coach escreve dois treinos para o mesmo dia (ex: duas "seg"), o sistema os diferencia por sessão. O atleta vê "Sessão 1" e "Sessão 2" como abas ou cards separados dentro do mesmo dia.

### Alterações

**1. Tipo `DayWorkout` — `src/types/outlier.ts`**
- Adicionar `session?: number` (1 | 2)
- Adicionar `sessionLabel?: string` (opcional, ex: "Manhã", "Tarde", ou horário sugerido "06:00")

**2. Editor do coach — `src/components/TextModelImporter.tsx`**
- Ao detectar dois blocos com o mesmo dia (ex: dois "DIA: SEG"), atribuir automaticamente `session: 1` e `session: 2`
- Permitir que o coach edite o `sessionLabel` (campo texto livre opcional, ex: "Manhã" ou "18:00")
- Na preview, mostrar "Sessão 1" e "Sessão 2" separadas dentro do mesmo dia

**3. Visão do atleta — `src/components/WeeklyTrainingView.tsx`**
- Ao renderizar o dia ativo, agrupar workouts por `session`
- Se houver 2 sessões: mostrar header "Sessão 1 · {label}" e "Sessão 2 · {label}" como separadores visuais
- Se houver 1 sessão (padrão): comportamento atual, sem mudanças visuais

**4. Publicação — `src/components/PublishToAthletesModal.tsx`**
- Sem alteração de schema no banco — o campo `session` viaja dentro do `plan_json.workouts[]` como parte do `DayWorkout`
- O merge por dia precisa considerar `session` como parte da chave de deduplicação (day + session)

**5. Completions — `src/hooks/useWeekWorkoutCompletions.ts`**
- Adaptar para suportar conclusão por sessão (session 1 e session 2 independentes)

**6. Dashboard — `src/components/DashboardBlocks.tsx`**
- `TodayWorkoutBlock`: se hoje tem 2 sessões, mostrar a próxima não concluída

### Sem alteração de banco
Tudo viaja no JSON (`plan_json.workouts[]`). A tabela `athlete_plans` não muda.

### UX para o coach
O coach cola o texto com dois blocos "DIA: SEG" — o parser detecta e cria Sessão 1 e Sessão 2 automaticamente. Ele pode dar um label opcional (horário sugerido).

### UX para o atleta
Na tela semanal, o dia com duas sessões mostra dois cards separados com indicação "Sessão 1" / "Sessão 2" + label do coach se houver. Cada sessão tem seu próprio botão de conclusão.

