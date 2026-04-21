

## Restaurar escudos e status do atleta no Dashboard

### O que está faltando

No `Dashboard.tsx` atual (rota `/app`) só são renderizados:
1. Streak Badge (quando ativo)
2. `WeeklySummaryCard` (resumo da semana)
3. `DiagnosticRadarBlock` (radar de diagnóstico)

**Sumiram do dashboard:**
- **`AthleteHeroIdentity`** — card de identidade com nome, status atual (OPEN/PRO/ELITE), avatar com coroa e barra de evolução. O componente está **importado mas nunca renderizado** no JSX (linha 47 do import, sem uso no return).
- **Jornada Outlier (escudos)** — os 3 escudos (OPEN / PRO / ELITE, ativos/travados) baseados em `useJourneyProgress`. O hook é chamado (linha 114) mas só usado pra detectar `isOutlier` no modal de level-up. Nenhum `<ShieldCrest />` é renderizado no dashboard.

### Plano de correção

**Adicionar 2 seções no topo do `<main>` do `Dashboard.tsx`**, logo abaixo do Streak Badge e acima do `WeeklySummaryCard`:

**Seção A — Identidade do Atleta (`AthleteHeroIdentity`)**
- Renderizar o componente já importado, passando: `status`, `rulerScore`, `confidence`, `validatingCompetition`, dados do `journeyProgress` e `athleteConfig`.
- Validar props reais do componente antes de plugar (vou abrir `AthleteHeroIdentity.tsx` na implementação).

**Seção B — Jornada Outlier (3 escudos)**
- Grid de 3 colunas com `<ShieldCrest level="OPEN|PRO|ELITE" active={...} />`.
- Estado `active` vem de `journeyProgress` (cada nível desbloqueado quando: status atingido + benchmarks da jornada cumpridos, conforme regra já existente em `useJourneyProgress`).
- Escudo do nível atual ganha destaque (ring/glow); escudos travados ficam dessaturados.
- Clicar em escudo travado abre tooltip/modal explicando o que falta (reusar lógica do `LevelUpModal` ou apenas tooltip simples na v1).

**Layout sugerido (ordem no main):**
```text
1. Streak Badge (já existe)
2. AthleteHeroIdentity              ← restaurar
3. Jornada Outlier (3 escudos)      ← restaurar
4. WeeklySummaryCard (já existe)
5. Empty state sem treino (já existe)
6. DiagnosticRadarBlock (já existe)
```

### O que NÃO vou mexer

- `WeeklySummaryCard`, `DiagnosticRadarBlock`, Streak, `LevelUpModal` — continuam como estão.
- Sidebar/MobileBottomNav — fora do escopo.
- Lógica de `useAthleteStatus` / `useJourneyProgress` — só vou consumir.

### Próximo passo

Aprovando o plano, eu entro em modo de implementação, leio `AthleteHeroIdentity.tsx` + `useJourneyProgress.ts` pra confirmar o contrato exato das props, e ploto as 2 seções no Dashboard com os dados certos.

