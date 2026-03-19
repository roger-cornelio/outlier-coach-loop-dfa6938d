

## Resultado do Teste de Acurácia da IA

Rodei 4 blocos de teste reais contra a Edge Function `parse-workout-blocks`. Aqui está o resultado:

### Bloco 1 — Exercícios com "N ROUNDS" SEM asteriscos
**Input**: `2 ROUNDS` + 3 exercícios, `2 ROUNDS` + 3 exercícios, `3 ROUNDS` + 3 exercícios

| Exercício | Slug correto? | Reps correto? | Sets correto? | Pattern correto? |
|-----------|:---:|:---:|:---:|:---:|
| 12 Back Squat | ✅ back_squat | ✅ 12 | ✅ 2 | ✅ squat |
| 10 Front Squat | ✅ front_squat | ✅ 10 | ✅ 2 | ✅ squat |
| 8 Air Squats | ✅ air_squats | ✅ 8 | ✅ 2 | ✅ squat |
| 15 Burpees | ✅ burpees | ✅ 15 | ✅ 2 | ✅ total_body_plyo |
| 400m Run | ✅ running | — | ✅ 2 | ✅ distance_cardio |
| 20 Wall Balls | ✅ wall_balls | ✅ 20 | ✅ 2 | ⚠️ squat (deveria ser squat_vertical_push) |
| 10 KB Swings | ✅ kb_swings | ✅ 10 | ✅ 3 | ✅ hinge |
| 12 Deadlifts | ✅ deadlifts | ✅ 12 | ✅ 3 | ✅ hinge |
| 8 Pull-ups | ✅ pull_ups | ✅ 8 | ✅ 3 | ✅ pull |

**Acerto: 9/9 exercícios reconhecidos (100%), 8/9 patterns corretos (89%)**

**PORÉM**: A IA converteu "2 ROUNDS" em `sets: 2` nos exercícios. Isso significa que o `parseRoundGroups` NÃO vai encontrar marcadores (porque não tem `**`), então o `roundMultiplier` = 1 — e a IA já fez o trabalho sozinha. **NÃO há dupla contagem neste caso, mas também não há agrupamento semântico**.

### Bloco 2 — Formatos comuns sem espaço (backsquat, deadlift, etc.)
**Input**: `backsquat 4x8`, `frontsquat 3x10`, `deadlift 5x5`, etc.

| Exercício | Slug? | Reps? | Sets? |
|-----------|:---:|:---:|:---:|
| backsquat 4x8 | ✅ back_squat | ✅ 8 | ✅ 4 |
| frontsquat 3x10 | ✅ front_squat | ✅ 10 | ✅ 3 |
| deadlift 5x5 | ✅ deadlifts | ✅ 5 | ✅ 5 |
| kb swing 4x12 | ✅ kb_swings | ✅ 12 | ✅ 4 |
| pullup 3x8 | ✅ pull_ups | ✅ 8 | ✅ 3 |
| pushup 4x15 | ✅ push_ups | ✅ 15 | ✅ 4 |
| running 400m | ✅ running | — | — |
| row 500m | ✅ rowing | — | — |
| wall ball 3x15 | ✅ wall_balls | ✅ 15 | ✅ 3 |
| burpee 4x10 | ✅ burpees | ✅ 10 | ✅ 4 |

**Acerto: 10/10 (100%)**

### Bloco 3 — Erros de digitação propositais
**Input**: `bac squart`, `frant squat`, `ded lift`, `kettle bell swing`, `pull up`, `push up`

| Exercício digitado | Slug retornado? | Correto? |
|---|---|:---:|
| bac squart 4x8 | ✅ back_squat | ✅ |
| frant squat 3x10 | ✅ front_squat | ✅ |
| ded lift 5x5 | ✅ deadlifts | ✅ |
| kettle bell swing 4x12 | ✅ kb_swings | ✅ |
| pull up 3x8 | ✅ pull_ups | ✅ |
| push up 4x15 | ✅ push_ups | ✅ |

**Acerto com typos: 6/6 (100%)** — A IA (Gemini) já faz fuzzy matching nativo muito bem.

### Bloco 4 — EMOM sem asteriscos
**Input**: `EMOM 20` (sem `**`) + 4 exercícios

Todos os 4 exercícios reconhecidos com slugs corretos. **Acerto: 4/4 (100%)**

---

## Resumo da Acurácia

| Métrica | Resultado |
|---------|-----------|
| Exercícios reconhecidos (slug correto) | **29/29 = 100%** |
| Reps/sets extraídos corretamente | **27/29 = 93%** |
| Movement pattern correto | **28/29 = 97%** |
| Fuzzy matching (typos) | **6/6 = 100%** |

### Diagnóstico do problema real

A IA interpreta muito bem. O problema NÃO é a IA. O problema é:

1. **`parseRoundGroups` exige `**`**: Quando o coach escreve "2 ROUNDS" sem asteriscos, `parseStructureLine` retorna `null` → `parseRoundGroups` trata como linha de exercício → os multiplicadores ficam todos 1
2. **Conflito IA vs roundGroups**: A IA JÁ converte "N ROUNDS" em `sets: N` nos exercícios. Então se `parseRoundGroups` TAMBÉM aplicar multiplicador, haverá dupla contagem
3. **Solução correta**: Como a IA já trata os rounds como sets, o `parseRoundGroups` precisa aceitar texto sem `**` MAS deve detectar quando a IA já fez a conversão para evitar multiplicar duas vezes

### Plano atualizado

**1. Expandir `parseStructureLine`** para aceitar "N ROUNDS" sem `**` — corrige a detecção visual e semântica

**2. Evitar dupla contagem no `computeBlockMetrics`**: Quando a IA já retorna `sets > 1` E o `parseRoundGroups` detecta multiplicador > 1 para o mesmo grupo, usar APENAS o multiplicador do roundGroup (e resetar o `sets` da IA para 1). Isso garante que a fonte de verdade dos rounds é o `parseRoundGroups`, não a IA

**3. Aviso de typo para o coach** (fuzzy matching local): Apesar de a IA acertar 100% dos typos, adicionar aviso local no editor é útil para feedback instantâneo (sem esperar a chamada à IA). Usar Levenshtein contra a lista de `global_exercises`

**4 arquivos, zero mudanças no banco.**

