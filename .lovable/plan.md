

## Plano: Aba única "Atletas" com linhas expandíveis (accordion inline)

### Conceito

Em vez de drawer ou sheet, cada atleta é uma **linha horizontal clicável** que **expande para baixo** mostrando todas as informações em layout horizontal (grid de colunas). O coach vê a lista completa e clica para expandir/recolher qualquer atleta sem sair da tela.

### Layout visual

```text
┌─────────────────────────────────────────────────────────────────────┐
│ [KPIs: Total | Em Alta | Atenção | Risco]    [Vincular] [Atualizar]│
├─────────────────────────────────────────────────────────────────────┤
│ 🔴 João Silva       3 dias ausente    40% adesão    📱 WhatsApp   │
│ ▼ EXPANDIDO ────────────────────────────────────────────────────── │
│ ┌──────────────┬──────────────┬──────────────┬───────────────────┐ │
│ │  Stats       │  Perfil      │  Feedbacks   │  Ações            │ │
│ │  Dias: 3     │  Exp: 2+     │  📅 De: Até: │  [Desvincular]   │ │
│ │  Treinos: 2  │  Meta: Tempo │  ▸ 28/03     │  [Suspender]     │ │
│ │  Adesão: 40% │  Bio: 80kg   │  ▸ 25/03     │  [WhatsApp CTA]  │ │
│ │  Bench: 5    │  Equip: Sled │              │                   │ │
│ └──────────────┴──────────────┴──────────────┴───────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│ 🟡 Maria Souza      1 dia ausente     80% adesão    📱 WhatsApp   │
│   (recolhido — clica pra expandir)                                 │
├─────────────────────────────────────────────────────────────────────┤
│ 🟢 Pedro Costa      0 dias ausente    100% adesão   📱 WhatsApp   │
└─────────────────────────────────────────────────────────────────────┘
```

### O que muda para o coach

- **5 abas → 3 abas**: Atletas | Importar | Programações
- Clica na linha do atleta → expande inline com 4 colunas horizontais
- Feedbacks com filtro de data (date picker) dentro da coluna de feedbacks
- Pode ter vários atletas expandidos ao mesmo tempo
- Tudo na mesma página, sem modal/drawer/sheet

### Detalhes técnicos

**Virtualização**: Precisa ser removida da lista (accordion com altura variável não funciona bem com virtualização fixa de 64px). Para 200 atletas com linhas de ~64px recolhidas, o DOM é leve (~200 divs simples). Se necessário, adicionar paginação (50 por página).

**Componente**: Usar `Collapsible` do Radix (já existe no projeto) para cada linha de atleta.

### Arquivos alterados

1. **`src/pages/CoachDashboard.tsx`**
   - Remover tabs "visao-geral", "atletas", "feedbacks"
   - 3 tabs: "atletas" (CoachOverviewTab), "importar", "programacoes"
   - Mover botão "Vincular Atleta" e ações (desvincular/suspender) como props para CoachOverviewTab
   - Remover import de CoachFeedbacksTab

2. **`src/components/CoachOverviewTab.tsx`**
   - Remover `Drawer` e `AthleteDetailDrawer`
   - Remover virtualização (`useVirtualizer`)
   - Cada `AthleteRow` vira `Collapsible` — linha recolhida = row atual, expandida = grid 4 colunas
   - Coluna "Feedbacks": date range picker (Calendar + Popover existentes) + query lazy por `athlete_id` + datas, limit 10, collapsible por data
   - Coluna "Ações": botões Desvincular, Suspender, WhatsApp (recebe callbacks via props)
   - Botão "Vincular Atleta" no header da lista
   - Paginação simples (50 por página) se `athletes.length > 50`

