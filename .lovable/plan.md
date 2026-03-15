

## Plano Completo: Aba Evolução (com fusão do CompetitionRadar no card existente)

### Mudança estratégica

Em vez de criar um `CompetitionRadarCard` separado, vamos **fundir a lógica de predição de pódio** diretamente no card de Prova Alvo que já existe dentro do `DiagnosticRadarBlock.tsx` (componente `MobilePathToEliteCard` e seção desktop). Isso transforma o card atual em um "Cockpit de Predição".

---

### Arquivos a CRIAR (4)

**1. `src/utils/evolutionUtils.ts`**
- `formatEvolutionTime(seconds)` — MM:SS sem horas quando < 1h
- Constante `ELITE_WEIGHTS` (run_total 50%, ski 6%, sled_push 4%, sled_pull 5%, bbj 7%, row 6%, farmers 5%, sandbag 7%, wall_balls 6%, roxzone 4%)
- `parseTimeInput("01:08:00") → seconds` para o input da tabela de targets
- Mock de PRs por estação para visualização inicial

**2. `src/components/evolution/FatigueIndexCard.tsx`** — "Resistência sob Fadiga"
- Mock: 8 runs com tempos crescentes (214s → 427s)
- Recharts `AreaChart` com linha amber e gradiente
- Gauge semicircular SVG com cores dinâmicas (emerald ≤5%, amber ≤12%, red >12%)
- Fórmula: `((Média_Run2a7 - Run1) / Run1) × 100`
- Texto dinâmico: "Sua corrida quebra X% após as estações de força..."

**3. `src/components/evolution/TargetSplitsTable.tsx`** — "Target Splits"
- Input de meta (default "01:08:00") com recálculo em tempo real
- Tabela shadcn: Estação | PR Atual (mock) | Target Split (amber) | Pace Necessário
- Target = tempo_total × peso_estação
- Botão "Exportar Target" (visual, outline)

**4. `src/components/evolution/EvolutionTab.tsx`** — Container
- Header "Sua Evolução"
- Renderiza apenas `FatigueIndexCard` + `TargetSplitsTable` (2 componentes, não 3)
- Layout responsivo: stack mobile, grid desktop, gap-6

---

### Arquivos a EDITAR (4)

**5. `src/components/DiagnosticRadarBlock.tsx`** — Fusão do Cockpit de Predição
- No bloco de "Prova Alvo inline" (linhas 974-996 mobile, linhas 2331-2353 desktop), adicionar logo abaixo da linha de Meta:
  - Uma `Progress` bar sutil mostrando % de proximidade ao pódio (usando dados mockados: atual 4797s, pódio 4200s)
  - Texto de gamificação em destaque: **"Faltam exatos 09:57 para o Pódio."**
  - Texto do fantasma sutil: *"👻 Se a prova fosse hoje, o 3º colocado chegaria 09:57 na sua frente."*
- Quando `provaAlvo` não existe, manter comportamento atual (sem mudança)
- Dados de pódio mockados via constante (futuramente virão do banco)

**6. `src/store/outlierStore.ts`** (linha 42)
- Adicionar `'evolution'` ao union type de `currentView`

**7. `src/pages/Index.tsx`** (linhas 241-255)
- Importar `EvolutionTab` (lazy ou direto)
- Adicionar ao `VIEW_COMPONENTS`: `evolution: EvolutionTab`

**8. `src/components/AppSidebar.tsx`** (linha 87) + `src/components/MobileNav.tsx`** (linha 76)
- Mudar o item "Evolução" de `view: 'benchmarks'` para `view: 'evolution'`
- Trocar ícone de `Trophy` para `TrendingUp`

---

### Resultado final

```text
┌─────────────────────────────────────────────────────────┐
│  DASHBOARD (existente)                                  │
│  ┌───────────────────────────────────────────────┐      │
│  │ 🎯 HYROX SÃO PAULO 2026 · 40d · Meta 01:08  │      │
│  │ ████████████████░░░░░░ 88% até o pódio        │ ← NOVO
│  │ Faltam exatos 09:57 para o Pódio.             │ ← NOVO
│  │ 👻 3º colocado chegaria 09:57 na sua frente   │ ← NOVO
│  └───────────────────────────────────────────────┘      │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ABA EVOLUÇÃO (nova)                                    │
│  ┌───────────────────────────────────────────────┐      │
│  │ Resistência sob Fadiga (Gauge + LineChart)     │      │
│  └───────────────────────────────────────────────┘      │
│  ┌───────────────────────────────────────────────┐      │
│  │ Target Splits (Tabela interativa com meta)     │      │
│  └───────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

A aba Evolução fica com **2 componentes próprios** (FatigueIndex + TargetSplits) e o terceiro (Radar de Competição) vive **integrado no card de Prova Alvo do Dashboard**, onde o atleta já olha naturalmente.

