

## Plano: Filtro de sessão com métricas por bloco, por sessão e total do dia

### UI

```text
┌─────────────────────────────────────────────────┐
│  SEG   TER   QUA   QUI   SEX   SAB   DOM       │  ← sem badge ×2
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  [ Todas ]  [ Sessão 1 · Manhã ]  [ Sessão 2 ] │  ← só quando dual session
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  ⏱ ~85min (total dia)  🔥 ~620 kcal (total dia)│  ← filtro "Todas"
│  ──────── ou ────────                           │
│  ⏱ ~50min (sessão 1)   🔥 ~398 kcal (sessão 1) │  ← filtro "Sessão 1"
└─────────────────────────────────────────────────┘

│  📦 Bloco: Corrida         ⏱ 50min  🔥 398kcal │  ← métricas por bloco
│  📦 Bloco: Conditioning    ⏱ 20min  🔥 145kcal │     (já existe, mas só
│  📦 Bloco: Core            ⏱ 15min  🔥  77kcal │      pra sessão 1)
└─────────────────────────────────────────────────┘
```

### Problema atual
- `blockMetricsMap` calcula métricas **só para `currentWorkout`** (sessão 1)
- Sessão 2 mostra `0 kcal / 0 min` nos blocos (linhas 501-503: `sessionIdx === 0` check)
- Header de tempo/kcal só aparece na sessão 1 (linhas 445-462)

### Implementação — arquivo único: `WeeklyTrainingView.tsx`

**1. Computar métricas para TODAS as sessões**
- Trocar `blockMetricsMap` de `useMemo` baseado em `currentWorkout` para um mapa indexado por sessão
- Novo shape: `Map<sessionIdx, { perBlock[], totalTime, totalCalories }>`
- Cada sessão computa seus blocos independentemente com `computeBlockMetrics` + fallback `estimateBlock`

**2. Calcular totais do dia**
- `dayTotalTime` = soma dos `totalTime` de todas as sessões
- `dayTotalCalories` = soma dos `totalCalories` de todas as sessões

**3. Adicionar estado de filtro de sessão**
- `activeSession: null | 1 | 2` (null = "Todas")
- Reset para `null` quando `activeDay` muda

**4. Remover badge ×2** (linhas 357-359)

**5. Renderizar barra de filtro** (entre day tabs e conteúdo)
- 3 pills: "Todas", "Sessão 1 · {label}", "Sessão 2 · {label}"
- Cada pill mostra subtotal: `⏱ Xmin · 🔥 Y kcal`
- Pill ativa: `bg-primary text-primary-foreground`

**6. Header de stats dinâmico**
- Filtro "Todas" → mostra `dayTotalTime` e `dayTotalCalories`
- Filtro "Sessão N" → mostra total daquela sessão
- Remove o check `sessionIdx === 0` que bloqueava stats da sessão 2

**7. Métricas por bloco em ambas sessões**
- Remove guard `sessionIdx === 0` (linhas 501-503) que zerava métricas da sessão 2
- Usa o mapa indexado por sessão para cada bloco

**8. Filtrar sessões exibidas**
- `displayedSessions = activeSession ? dayWorkouts.filter(w => w.session === activeSession) : dayWorkouts`

### Resultado
- Cada bloco mostra tempo e kcal corretos (ambas sessões)
- Subtotal por sessão visível nas pills do filtro
- Total do dia agregado quando "Todas" está selecionado
- Navegação intuitiva entre sessões

