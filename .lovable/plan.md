

## Plano: Redesign do painel "Nível Competitivo" — visual limpo e imediato

### Problemas atuais

1. **Métricas principais** (Última Prova, Meta, Faltam, Previsão) — todas do mesmo tamanho, sem hierarquia visual. Texto `text-[10px]` muito pequeno
2. **Grid de Prova Alvo** — mesma densidade visual, difícil distinguir do bloco de cima
3. **Barra de progresso** — fina (`h-2`), pouco visível
4. **Separadores** — `border-l border-border/10` quase invisíveis no dark mode
5. Tudo dentro de um `bg-muted/5` que não destaca o painel

### Novo layout

```text
┌─────────────────────────────────────────────────────┐
│ 🏆 NÍVEL COMPETITIVO                               │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────┐│
│  │ ÚLT.PROVA│  │ META PRO │  │  FALTAM  │  │PREV.││
│  │ 1h19m57s │  │ 1h13m36s │  │ ↓ 6m21s  │  │~10m ││
│  │ (grande) │  │ (grande) │  │ (destaque│  │     ││
│  └──────────┘  └──────────┘  │  cor)    │  └─────┘│
│                               └──────────┘         │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░  68%             │
│                                                     │
│  Com evolução de 39s/mês, atinge PRO em ~10 meses  │
│                                                     │
│  ── PROVA ALVO ──────────────────────────────────  │
│  HYROX 2026 │ PRO DOUBLES │ 25 dias │ — │ 1h19m24s│
└─────────────────────────────────────────────────────┘
```

### Alterações em `src/components/DiagnosticRadarBlock.tsx`

**1. Cards individuais para as 4 métricas principais** (linhas 1885-1921)
- Cada métrica dentro de um `bg-card/50 border border-border/20 rounded-lg p-3`
- Label: `text-[11px]` (de `text-[10px]`)
- Valor: `text-lg font-extrabold` (de `text-sm font-bold`)
- "Faltam" com fundo colorido: `bg-amber-500/10 border-amber-500/30` quando gap > 0, `bg-emerald-500/10` quando atingido
- Ícones com cor primária consistente

**2. Barra de progresso mais visível** (linhas 1924-1931)
- `h-2` → `h-3`
- Adicionar label de porcentagem à direita: `{progressPercent}%`
- Gradient na barra: `bg-gradient-to-r from-primary to-amber-500`

**3. Frase de ação com mais destaque** (linhas 1933-1958)
- `text-[11px]` → `text-xs`
- Centralizada com ícone contextual
- Remover o botão "i" separado, integrar como tooltip no texto

**4. Seção Prova Alvo com header próprio** (linhas 1960-2008)
- Adicionar mini-header "PROVA ALVO" com ícone `Flag`
- Cards individuais em vez de grid com borders invisíveis
- `text-[9px]` → `text-[10px]` para labels, `text-xs` → `text-sm` para valores

**5. Container externo mais marcante**
- `bg-muted/5 border border-border/15` → `bg-gradient-to-b from-card/80 to-card/40 border border-border/30`

### Resultado esperado
- Hierarquia visual clara: valores grandes saltam aos olhos
- Cards separados para cada métrica eliminam ambiguidade
- Barra de progresso mais proeminente com percentual
- Prova Alvo visualmente separada mas integrada

