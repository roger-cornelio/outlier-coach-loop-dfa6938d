

# Refatoracao Mobile-First do Dashboard -- Card de Decisao

## Resumo

Reorganizar visualmente o Dashboard na rota `/app` para mobile, consolidando 6 blocos separados em um unico "Card de Decisao" acima do fold. No desktop, manter layout atual. Nenhuma alteracao de banco ou calculo.

---

## Arquivos alterados

1. `src/components/DiagnosticRadarBlock.tsx` -- refatoracao principal
2. `src/components/Dashboard.tsx` -- passar dados de treino do dia como props

---

## 1. Card de Decisao (mobile-first, acima do fold)

Substituir visualmente no mobile (< 768px) os blocos atuais: Identidade, Status Competitivo, Jornada Outlier (score, progresso, marco, gargalos, volume) por um unico card compacto.

### Estrutura do Card

```text
+------------------------------------------+
| [Nome]                    [Toggle avancado]|
| HYROX PRO WOMEN                          |
|                                          |
| PRO ─────────●──────── ELITE             |
|              78%                         |
|                                          |
| Faltam para ELITE:                       |
| - Sled Pull (delta -18s)     **          |
| - Sandbag (delta -12s)       ***         |
|                                          |
| Ultimo marco: Nivel PRO alcancado        |
|                                          |
| Treino de hoje: Forca + Condicionamento  |
|                                          |
| +--------------------------------------+ |
| |     BORA TREINAR > Forca             | |
| |     (botao alto, ~30% viewport)      | |
| +--------------------------------------+ |
+------------------------------------------+
```

### Detalhes tecnicos

- Usar `useIsMobile()` do hook existente (`src/hooks/use-mobile.tsx`) para detectar mobile
- No mobile: renderizar o Card de Decisao compacto
- No desktop: manter layout atual (todos os blocos expandidos como hoje)
- O Card consolida dados de: `useAthleteStatus`, `useJourneyProgress`, `outlierScore`, `scores` (props), e novos props de treino do dia

---

## 2. Score relativo (nao absoluto)

Remover exibicao "742 / 1000" no mobile.

Substituir por: **"{progressToTarget}/100 para {targetLevelLabel}"**

Dados ja existem em `journeyData.progressToTarget` e `journeyData.targetLevelLabel`.

No desktop, manter o score absoluto como esta.

---

## 3. Perfil Fisiologico colapsado no mobile

No mobile: substituir o bloco do radar por um botao colapsado:

"Perfil fisiologico >"

Ao clicar: abrir um Dialog (modal full-screen no mobile) contendo:
- Radar chart
- VO2 Max
- Limiar de lactato
- Analise por estacao
- Texto de conexao com score

No desktop: manter radar inline como hoje (expandido por padrao).

Usar o componente `Dialog` ja existente (`src/components/ui/dialog.tsx`).

---

## 4. Dados Avancados colapsados

No mobile: mover para uma secao colapsada "Dados avancados >" abaixo do Card de Decisao:
- Mini barras de Benchmarks e Treinos (com contadores animados)
- Gargalos de Performance (com estrelas)
- Volume (benchmarks/treinos restantes)
- Analise ultima prova (Limitador + Projecao + Impacto)
- Indicadores fisiologicos (VO2, Lactato)

No desktop: manter tudo visivel como hoje.

---

## 5. Toggle "Modo Avancado"

Adicionar um Switch (componente ja existe em `src/components/ui/switch.tsx`) no canto superior direito do card mobile.

Estado persistido em `localStorage` via key `outlier-advanced-mode`.

Quando ativado:
- Mostrar radar inline
- Mostrar VO2 e Lactato inline
- Mostrar benchmarks e gargalos inline
- Essencialmente volta ao layout completo atual

Quando desativado (padrao):
- Layout simplificado do Card de Decisao

Visivel apenas no mobile. No desktop, ignorar (sempre modo completo).

---

## 6. Integracao "Treino de hoje" no Card

### Mudanca em `Dashboard.tsx`

Passar novas props para `DiagnosticRadarBlock`:
- `todayWorkoutLabel`: string com nome/foco do treino (derivado de `workoutFocusCopy` ou `todayWorkout.blocks`)
- `hasTodayWorkout`: boolean
- `onStartWorkout`: callback para `handleStartWorkout()`

### Mudanca em `DiagnosticRadarBlock.tsx`

Aceitar novas props opcionais:
```typescript
interface DiagnosticRadarBlockProps {
  scores: CalculatedScore[];
  loading?: boolean;
  hasData: boolean;
  // Novas props para treino do dia
  todayWorkoutLabel?: string;
  hasTodayWorkout?: boolean;
  onStartWorkout?: () => void;
}
```

O CTA "BORA TREINAR" no Card de Decisao mobile tera:
- Altura de ~30vh (usando `min-h-[30vh]`)
- Texto: "BORA TREINAR > {foco_do_treino}"
- Chama `onStartWorkout` ao clicar
- Se nao ha treino: "Sem treino hoje" (botao desabilitado)

---

## 7. Gargalos no Card (top 2 com delta)

No Card de Decisao, mostrar apenas os 2 piores gargalos (ja calculados como `worstMetrics`).

Para cada gargalo, exibir:
- Nome da estacao (ja existe via `METRIC_LABELS`)
- Estrelas (ja existe via `percentileToStars`)
- O delta de tempo nao esta disponivel nos dados atuais (scores tem apenas percentil, nao tempo). Mostrar estrelas como proxy de gravidade.

---

## Fluxo de dados (sem mudancas de backend)

```text
Dashboard.tsx
  |-- useAthletePlan() --> todayWorkout, workoutFocusCopy
  |-- useDiagnosticScores() --> scores
  |-- handleStartWorkout()
  |
  v
DiagnosticRadarBlock (props: scores, todayWorkoutLabel, onStartWorkout)
  |-- useIsMobile() --> isMobile
  |-- useAthleteStatus() --> status, outlierScore
  |-- useJourneyProgress() --> progressToTarget, currentLevelLabel, targetLevelLabel
  |-- useState('outlier-advanced-mode') --> advancedMode
  |
  |-- if mobile && !advancedMode: Card de Decisao compacto
  |-- if mobile && advancedMode: layout completo atual
  |-- if desktop: layout completo atual (sempre)
```

---

## Regras respeitadas

- Nenhuma tabela alterada
- Nenhum calculo alterado
- Dados apenas reorganizados visualmente
- Mobile-first responsivo
- Desktop nao quebra (mantido identico)
- Dados reais existentes (sem mocks)
- useIsMobile() ja existe no projeto

