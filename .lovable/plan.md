

## Plano: Badge de "Novo Treino" na Sidebar e Mobile Nav

### Objetivo
Mostrar um dot/badge pulsante no item "Treino Semanal" quando o coach publicar um novo plano que o atleta ainda nao visualizou.

### Mecanismo

1. **Hook `useNewPlanIndicator`** (novo arquivo):
   - Armazena em `localStorage` o timestamp da ultima vez que o atleta abriu a view `weeklyTraining` (`outlier_last_seen_plan_ts`)
   - Compara com o `published_at` mais recente retornado pelo `useAthletePlan`
   - Retorna `{ hasNewPlan: boolean, markAsSeen: () => void }`
   - `markAsSeen()` atualiza o timestamp no localStorage e e chamado quando o atleta navega para `weeklyTraining`

2. **`AppSidebar.tsx`** — Adicionar dot vermelho pulsante no item "Treino Semanal":
   - Importar `useNewPlanIndicator`
   - Renderizar `<span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />` ao lado do icone/texto quando `hasNewPlan` for true
   - Chamar `markAsSeen()` quando o usuario clicar no item

3. **`MobileNav.tsx`** — Mesmo badge no menu mobile:
   - Mesma logica: importar hook, mostrar dot, chamar `markAsSeen()` no click

4. **`MobileNav.tsx` trigger button** — Dot no botao hamburger quando ha novidade (opcional mas de alto impacto visual):
   - Mostrar dot vermelho no canto superior direito do botao de menu

### Arquivos

| Arquivo | Acao |
|---|---|
| `src/hooks/useNewPlanIndicator.ts` | Criar hook |
| `src/components/AppSidebar.tsx` | Adicionar badge no "Treino Semanal" |
| `src/components/MobileNav.tsx` | Adicionar badge no "Treino Semanal" + dot no hamburger |

### Detalhes tecnicos

- Sem alteracao de banco — usa apenas `localStorage` + dados ja disponíveis do `useAthletePlan`
- O hook escuta o realtime indiretamente: quando `useAthletePlan` refaz fetch via realtime, o `published_at` atualiza e o badge aparece automaticamente
- O dot desaparece ao navegar para `weeklyTraining` (ambas navs chamam `markAsSeen`)

