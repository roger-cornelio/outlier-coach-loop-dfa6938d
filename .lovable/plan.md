

## Plano: Polish Completo — Mobile (430px) + Web — Admin, Coach e Atleta

### Escopo Total

O app tem **3 acessos distintos** (Atleta, Coach, Admin) com ~25 telas/abas que precisam de polish responsivo. O trabalho será dividido em **4 batches** para execução organizada.

---

### Regra Geral de Polish (aplicada a todos os arquivos)

```text
PADDING:     px-6 → px-3 sm:px-6    |  py-6 → py-4 sm:py-6
CARDS:       p-6  → p-4 sm:p-6      |  p-8 → p-5 sm:p-8
FONTS:       text-3xl → text-2xl sm:text-3xl
             text-2xl → text-xl sm:text-2xl
             text-xl  → text-lg sm:text-xl
BUTTONS:     px-8 py-5 → px-6 py-4 sm:px-8 sm:py-5
GAPS:        gap-6 → gap-4 sm:gap-6
GRIDS:       Garantir grid-cols-1 no mobile com sm:grid-cols-2
MODALS:      DialogContent → max-w-[95vw] sm:max-w-lg, p-4 sm:p-6
TABS:        text-xs no mobile, text-sm no sm:
ICONS:       w-6 h-6 → w-5 h-5 sm:w-6 sm:h-6
OVERFLOW:    Tabelas com overflow-x-auto, textos com truncate
```

---

### Batch 1 — Fluxo Atleta (telas do dia-a-dia)

| Arquivo | O que muda |
|---|---|
| `Dashboard.tsx` | Padding main já ajustado, verificar cards internos |
| `WeeklyTrainingView.tsx` | Já ajustado, verificar exercício lines e completion buttons |
| `WorkoutExecution.tsx` | Block cards p-6→p-4, timer font size, exercise text truncate |
| `PreWorkoutScreen.tsx` | Coach message container padding, CTA button sizing |
| `PerformanceFeedback.tsx` | Session summary table spacing, feedback form padding |
| `ResultRecording.tsx` | Form inputs padding, submit button sizing |
| `BenchmarksScreen.tsx` | Já bom, verificar tabs text-xs consistency |
| `DiagnosticRadarBlock.tsx` | Charts height reduzir no mobile, section gaps |
| `AthleteConfig.tsx` | Form sections padding, option cards sizing |
| `AthleteHeroIdentity.tsx` | Avatar + text layout em mobile |

### Batch 2 — Fluxo Coach (dashboard + tabs)

| Arquivo | O que muda |
|---|---|
| `CoachDashboard.tsx` | Header padding px-4→px-3 mobile, tab triggers text-xs |
| `CoachOverviewTab.tsx` | Já ajustado grid-cols-2, verificar KPI cards |
| `CoachSpreadsheetTab.tsx` | Textarea e preview cards padding, action buttons |
| `CoachProgramsTab.tsx` | Workout cards padding, action buttons row wrap |
| `PublishToAthletesModal.tsx` | Modal max-width, athlete list scroll, step indicators |
| `CoachAuth.tsx` | Login form centering, input sizes |
| `CoachPending.tsx` | Container padding |
| `LinkAthleteModal.tsx` | Modal padding e input sizes |

### Batch 3 — Fluxo Admin

| Arquivo | O que muda |
|---|---|
| `AdminPortal.tsx` | Sidebar: hidden no mobile com hamburger toggle, main content p-6→p-3 sm:p-6 |
| `admin/BusinessMetricsDashboard.tsx` | KPI grid responsivo |
| `admin/AnalyticsDashboard.tsx` | Charts container padding |
| `admin/ServiceQualityDashboard.tsx` | Tables overflow-x-auto |
| `admin/CRMAdmin.tsx` | Table responsivo |
| `UserManagement.tsx` | Table/list responsivo |
| `CoachApplicationsAdmin.tsx` | Cards padding |

### Batch 4 — Páginas Standalone

| Arquivo | O que muda |
|---|---|
| `Landing.tsx` | Já ajustado, verificar seções restantes |
| `Auth.tsx` | Já ajustado, verificar form inputs |
| `DiagnosticoGratuito.tsx` | Search + results cards padding, chart sizing |
| `ImportarProva.tsx` | Steps padding, search input, results cards |
| `ProvaAlvo.tsx` | Cards padding, form layout |
| `Nutricao.tsx` | Já tem p-3 sm:p-6, verificar cards |
| `MedicinaDoEsporte.tsx` | Mesma verificação |
| `simulator/SimulatorScreen.tsx` | Phase cards, splits table overflow-x-auto |
| `simulator/ActiveSimulator.tsx` | Timer display, station cards |

---

### Detalhes Técnicos Críticos

**AdminPortal (sidebar no mobile):**
A sidebar fixa de 256px é inacessível em 430px. Solução: no mobile, sidebar fica `hidden` por padrão com um botão hamburger no header que abre como overlay (position fixed, z-50). Sidebar expanded = overlay escuro + sidebar desliza da esquerda.

**Modais grandes (PublishToAthletesModal, BlockEditorModal):**
Todos os `DialogContent` que usam `max-w-2xl` ou `max-w-4xl` ganham `max-w-[95vw] sm:max-w-2xl` para não cortar conteúdo no mobile.

**Tabelas (admin, splits, benchmarks):**
Wrap com `<div className="overflow-x-auto -mx-3 px-3">` para permitir scroll horizontal sem quebrar layout.

---

### Estimativa

- **~25 arquivos** com alterações CSS/Tailwind
- **0 alterações no banco** ou lógica
- **4 batches** sequenciais para controle de qualidade
- Foco: padding, font-size, grid breakpoints, overflow, modal sizing

