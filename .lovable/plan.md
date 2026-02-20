
# Melhoria do Bloco "Evolução" no Dashboard

## Diagnóstico do problema

O bloco "Evolução: ---" existe em dois lugares:

1. **Mobile** — `MobileStatusBlock` (DiagnosticRadarBlock.tsx, linhas 265-301): linha hardcoded `<span className="text-muted-foreground">---</span>`. Não recebe `previousCompetition` nem `meta_time_next_level`.

2. **Desktop** — `PerformanceStatusCard` (PerformanceStatusCard.tsx): o componente JÁ tem interface para `previousCompetition` e `eliteTargetSeconds`, mas esses dados nunca são passados quando o componente é usado no mobile (linhas 770-776) — então o chip de Evolução e Meta Elite simplesmente nunca aparecem.

## Dados disponíveis (sem backend)

- `getOfficialCompetitions()` retorna array ordenado por `created_at` desc. Logo:
  - `officialCompetitions[0]` = última prova (= `validatingCompetition`)
  - `officialCompetitions[1]` = prova anterior (= `previousCompetition` — existe se o atleta tem >= 2 provas)
- `athleteStatusSystem.ts` tem constantes `LEVEL_TOP_THRESHOLDS` com os tempos alvo por nível/gênero — podemos usar o limiar do próximo nível como `meta_time_next_level`
- `race_count` pode ser inferido pelo tamanho de `getOfficialCompetitions()`

## Estratégia de implementação

### Passo 1 — Derivar `previousCompetition` no componente principal

Em `DiagnosticRadarBlock` (linha ~635), onde `validatingCompetition` já é obtido via `useAthleteStatus`, também chamar `useBenchmarkResults` para pegar `getOfficialCompetitions()` e derivar:

```
const officialCompetitions = getOfficialCompetitions();
const previousCompetition = officialCompetitions.length >= 2 ? officialCompetitions[1] : null;
const raceCount = officialCompetitions.length;
```

### Passo 2 — Criar helper `getEliteTargetSeconds`

Função pura (no arquivo `PerformanceStatusCard.tsx` ou utilitário) que recebe `status` e `gender` e retorna o tempo alvo em segundos para o próximo nível, baseado nas constantes existentes de `athleteStatusSystem.ts`. Sem chamadas de rede.

Exemplo: PRO feminino → topo do PRO = 70 min = 4200s.

### Passo 3 — Reformular `MobileStatusBlock` → `MobilePerformanceStatusBlock`

Substituir a implementação de `MobileStatusBlock` para:

- **Linha 1 — Meta do próximo nível** (se existir `meta_time_next_level`):
  - `delta > 0`: "Faltam Xm Ys para ELITE"
  - `delta <= 0`: "Meta ELITE atingida ✔" (em verde)
  - Nunca exibir valor negativo no texto

- **Linha 2 — Evolução** (3 casos do prompt):
  - `previousCompetition` existe e `|diff| >= 30s`:
    - Melhora (diff < -30): `↓ Xm Ys vs última prova` (verde)
    - Piora (diff > 30): `↑ Xm Ys vs última prova` (âmbar)
  - `previousCompetition` existe mas `|diff| < 30s`: não exibir linha 2
  - `previousCompetition` não existe:
    - `raceCount === 0` ou `1`: CTA "Evolução disponível após próxima prova. Importe sua prova anterior →"
    - Botão CTA abre modal de resultado (`onStartWorkout` existente ou navegação para `/benchmarks`)

- **Guardrails**:
  - Nunca exibir `---`, `NaN`, `Infinity`, percentuais negativos
  - Máximo 2 linhas visíveis abaixo de "Última prova"
  - Se não há `validatingCompetition`, ocultar o bloco inteiro

### Passo 4 — Passar `previousCompetition` e `eliteTargetSeconds` para `PerformanceStatusCard` (desktop/mobile)

No trecho mobile (linhas 770-776) e desktop, passar os novos dados. O componente `PerformanceStatusCard` já tem a lógica pronta para renderizar esses chips — só faltava os dados chegarem.

### Passo 5 — Helpers puros e testáveis

Criar em `PerformanceStatusCard.tsx` (ou extrair para `src/utils/timeCalc.ts` se já existir):

```typescript
// Já existe em timeCalc.ts — apenas garantir export
parseTimeToSeconds(input: string | number): number | null
formatSecondsToXmYs(seconds: number): string  // ex: "72m15s"
```

Verificar se `src/utils/timeCalc.ts` já tem essas funções antes de duplicar.

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `src/components/DiagnosticRadarBlock.tsx` | Derivar `previousCompetition`, `raceCount`, `eliteTargetSeconds`; reformular `MobileStatusBlock`; passar dados para `PerformanceStatusCard` |
| `src/components/dashboard/PerformanceStatusCard.tsx` | Adicionar helper `getEliteTargetSeconds`; garantir que chip "Evolução" usa `formatSecondsToXmYs` com regra de 30s mínimos; adicionar CTA quando sem histórico |

Nenhuma mudança de backend, tabelas, policies ou rotas.

## Comportamento esperado por conta de teste

**Lais Morais (PRO, 1 prova):**
- Linha 1: "Faltam Xm Ys para ELITE" (baseado no tempo dela vs limiar PRO topo)
- Linha 2: "Evolução disponível após próxima prova. Importe sua prova anterior →"

**Atleta com 2+ provas e melhora > 30s:**
- Linha 1: Meta Elite (se calculável)
- Linha 2: "↓ 2m10s vs última prova" (verde)

**Atleta com 2 provas e diferença < 30s:**
- Linha 1: Meta Elite
- Linha 2: ausente (não renderiza espaço vazio)

## Guardrails finais

- `formatSecondsToXmYs` sempre retorna `XmYs` (sem horas visíveis, ex: `72m15s`)
- `|diff|` sempre com `Math.abs` antes de formatar
- Se `delta_meta <= 0`: texto "Meta atingida ✔", nunca "-Xm"
- Bloco oculto por completo se não há `validatingCompetition`
