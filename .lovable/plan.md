

## Plano: Nome de exibição do Coach — identidade e pertencimento

### Problema

O painel do coach mostra "diego.mutacao" (prefixo do email) porque o campo `name` no perfil está vazio. Não existe um fluxo para o coach definir como quer ser chamado.

### Solução

Usar o campo `name` já existente na tabela `profiles` (não precisa de migration). Adicionar um campo editável no painel do coach para definir o nome de exibição, e destacar visualmente esse nome em todos os pontos.

### Alterações

| Arquivo | O que muda |
|---|---|
| `src/pages/CoachDashboard.tsx` | Header: nome do coach em destaque (`text-lg font-bold text-primary` em vez de `text-sm text-muted-foreground`). Adicionar modal/inline edit para o coach definir seu nome na primeira vez (ou via clique no nome). |
| `src/pages/CoachDashboard.tsx` | Ao detectar que `profile.name` está vazio ou parece email, exibir prompt para o coach preencher "Como quer ser chamado?" — salva em `profiles.name`. |
| `src/utils/displayName.ts` | Já funciona corretamente — `getCoachDisplayName` prioriza `name` sobre email. Nenhuma mudança necessária. |
| `src/components/AthleteConfig.tsx` | Já usa `getCoachDisplayName` — vai funcionar automaticamente quando o coach preencher o nome. |

### Detalhes

**Header do Coach Dashboard:**
- Layout atual: "Painel do Coach" (h1) + email prefix (p muted)
- Layout novo: "Painel do Coach" (h1) + nome do coach em `text-lg font-semibold text-primary` com ícone de edição sutil
- Se nome não definido, mostrar prompt inline "Defina seu nome →"

**Modal/Inline de nome:**
- Input simples: "Como você quer ser chamado pelos seus atletas?"
- Salva em `profiles.name` via update direto
- Atualiza `profile` no `useAuth` via `refreshProfile`

**Propagação automática:**
- `AthleteConfig` (coach vinculado) — já usa `getCoachDisplayName(coachProfile)` → pega `name`
- `WeeklyTrainingView` — não mostra nome do coach atualmente, sem mudança
- `ServiceQualityDashboard` (admin) — já usa `getCoachDisplayName`

### Resultado

Coach define "Diego Mutação" como nome → aparece em destaque no header do painel, nas configurações do atleta, e em qualquer lugar que use `getCoachDisplayName`.

