# Sistema Jornada OUTLIER V1

## Resumo

Implementar o sistema simplificado de progressao do atleta com duas dimensoes independentes: **Categoria** (definida por prova oficial) e **Jornada OUTLIER** (definida por treinos + benchmarks). Sem alterar layout, apenas logica, textos e contadores.

## Mudancas no Banco de Dados

### 1. Atualizar `status_level_rules` (migration SQL)

Atualizar os registros OPEN, PRO e ELITE com os novos requisitos do prompt:


| Level | training_min_sessions | benchmarks_required | official_race_required | &nbsp; |
| ----- | --------------------- | ------------------- | ---------------------- | ------ |
| OPEN  | 120                   | 3                   | false                  | &nbsp; |
| PRO   | 200                   | 5                   | true                   | &nbsp; |
| ELITE | 400                   | 10                  | true                   |        |


**OUTLIER OPEN pode existir sem prova.**

Peça pra deixar isso claro no código:

```
if level == OPEN:
    ignore race requirement
```

  
  
Remove o `training_window_days` como fator limitante (ou seta para 99999) -- treinos contam para sempre.

## Mudancas no Codigo

### 2. `src/hooks/useJourneyProgress.ts` -- Reescrever logica central

**Conceitos novos:**

- `category`: OPEN (default sem prova), PRO ou ELITE -- vem do melhor tempo oficial vs cortes do Admin
- `isOutlier`: boolean -- atingiu todos os requisitos do nivel da sua categoria
- `outlierLevel`: o nivel OUTLIER que o atleta JA conquistou (pode ser diferente da categoria)
- outlierLevel <= category
- trainingSessions = unique workoutResults dates
  benchmarks = unique benchmark IDs  
  tempo <= corte → sobe categoria

**Logica simplificada:**

1. Contar treinos registrados = `workoutResults.length` (do store/localStorage, 1 por dia max)
2. Contar benchmarks = unique benchmark IDs completed
3. Categoria = melhor tempo oficial comparado com cortes (sem prova = OPEN)
4. Para cada nivel (OPEN -> PRO -> ELITE), verificar se atende tempos de prova (definidos pelo admin)
5. O proximo nivel acima = target
6. benchmarks únicos definidos pelo Admin.
7. Se categoria subir e requisitos já cumpridos,
  outlierLevel atualiza automaticamente.
8. Benchmark NÃO deve contar como treino.
  Senão atleta faz 3 benchmarks no mesmo dia e ganha 3 treinos.
9. &nbsp;

**Remover:**

- Calculo de `continuousPosition` baseado em peso 60/40
- CAP logic (remover limitacao de progresso sem prova -- a prova simplesmente e um requisito booleano)
- Logica complexa de jump rules e race rank

**Novos campos no `JourneyPosition`:**

- `trainingSessions: number` -- contagem real de treinos unicos (max 1/dia)
- `isOutlier: boolean` -- atingiu todos requisitos do nivel atual
- `outlierTitle: string` -- ex: "ATLETA OUTLIER -- OPEN" ou null
- missingRequirements: string[]
- nextRequirements: {
    treinosRestantes,
    benchmarksRestantes,
    provaNecessaria
  }

### 3. `src/components/LevelProgress.tsx` -- Atualizar textos e contadores

**Hero Card:**

- Titulo: "ATLETA OUTLIER" (se isOutlier) ou "Categoria: {OPEN/PRO/ELITE}"
- Subtitulo: "Categoria {X}" quando for outlier
- Score grande: remover o "/100", mostrar contadores diretos

**Contadores (substituir Stats Grid):**

- Treinos: `147 / 200`
- Benchmarks: `3 / 5`

**Checklist de requisitos (no NextLevelModal e no sheet de nivel):**

- Check/X para treinos
- Check/X para benchmarks  
- Check/X para prova oficial (se necessaria)

**Texto quando falta prova:**

```
Para virar PRO:
[check] 200 treinos
[check] 5 benchmarks
[x] Prova oficial PRO
```

### 4. `src/components/NextLevelModal.tsx` -- Simplificar

- Remover referencia a `training_window_days` ("nos ultimos X dias")
- Mostrar checklist simples: treinos, benchmarks, prova
- Remover cap warning (nao existe mais cap gradual)
- Adicionar texto "ATLETA OUTLIER -- {Categoria}" quando conquistado

### 5. Contagem real de treinos

Atualmente `workoutResults` no store conta cada treino registrado. Precisamos garantir max 1 por dia:

- No `useJourneyProgress`, agrupar `workoutResults` por data (YYYY-MM-DD) e contar dias unicos
- Tambem contar do localStorage (`outlier-benchmark-history`) agrupando por dia

### 6. Remover complexidade morta

- Remover `progressSystem.ts` das dependencias do journey (nao e mais usado)
- Simplificar `useAthleteStatus` -- categoria vem apenas de prova oficial, sem calculo complexo de score
- Remover referencia a `CONFIDENCE_LABELS`, `weeksWithGoodPerformance`, `consistencyScore` do LevelProgress

## Arquivos Afetados

1. **Migration SQL** -- atualizar `status_level_rules` com novos valores
2. `**src/hooks/useJourneyProgress.ts**` -- reescrever logica de progressao
3. `**src/components/LevelProgress.tsx**` -- atualizar textos, contadores, remover complexidade
4. `**src/components/NextLevelModal.tsx**` -- simplificar checklist
5. `**src/components/StatusExplainerModal.tsx**` -- atualizar textos explicativos (se existir)

## O que NAO muda

- Layout visual (cards, regua, cores, animacoes)
- Roteamento e navegacao
- Sistema de login/auth
- Logica de treino/workout execution
- Admin panel