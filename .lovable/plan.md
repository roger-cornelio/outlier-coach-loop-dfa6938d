

## Plano: Corrigir inconsistências matemáticas, redundâncias e UX do Dashboard

5 problemas identificados, 3 arquivos a editar.

---

### 1. Corrigir a matemática da Projeção (gap ÷ meses ≠ rate)

**Arquivo: `src/utils/evolutionTimeframe.ts`**

O problema: `months = Math.ceil(rawMonths)` arredonda pra cima, mas `ratePerMonth` continua o valor fixo do tier. Resultado: `rate × months > gap`.

Solução: Após calcular `months`, recalcular o `ratePerMonth` exibido como `Math.ceil(gap / months)`. Assim a conta de padaria sempre fecha.

```
const adjustedRate = Math.ceil(gapSecondsToImprove / months);
return { months, tierLabel, ratePerMonth: adjustedRate, gapFormatted };
```

---

### 2. Fundir textos redundantes do Pódio em uma narrativa única

**Arquivo: `src/components/DiagnosticRadarBlock.tsx`** (linhas ~1017-1022 mobile, e equivalente desktop ~2370-2380)

Atual:
- "Faltam exatos 09:57 para o Pódio."
- "👻 Se a prova fosse hoje, o 3º colocado chegaria 09:57 na sua frente."

Novo (uma narrativa):
- **"Faltam exatos 09:57 para o Pódio."** (bold, foreground)
- **"Se a prova fosse hoje, o 3º colocado chegaria quase 10 minutos na sua frente."** (cinza sutil, sem emoji redundante — usar 👻 apenas aqui)

Quando gap < 60s, dizer "segundos"; quando ≥ 60s, arredondar para "quase X minutos" para ser mais impactante sem repetir o número exato.

---

### 3. Remover número redundante do texto da Projeção de Evolução

**Arquivo: `src/components/DiagnosticRadarBlock.tsx`** (linhas ~2309-2312 mobile, ~2468-2471 desktop) + **`src/components/diagnostico/EvolutionProjectionCard.tsx`** (linhas 122-126)

Atual: "você pode eliminar **6min 21s** do seu tempo em aproximadamente **10 meses**..."
— Redundante porque os 3 cards abaixo já mostram Gap, Rate e Meses.

Novo: "Com o método OUTLIER, baseado em fisiologia aplicada, este é o ritmo de evolução necessário para atingir o próximo nível:" (sem números no texto, deixar os cards falarem)

---

### 4. Trocar o "—" do campo Evolução por "Aguardando Prova"

**Arquivo: `src/components/DiagnosticRadarBlock.tsx`** (linhas ~1900-1901)

Atual: `evolutionValue = '—'` quando não há prova anterior.

Novo: `evolutionValue = 'Aguardando'` com classe `text-muted-foreground/50 text-[8px]` para parecer um empty state intencional, não um bug.

---

### 5. (Sem mudança de código) Sobre as 3 metas conflitantes

A "Meta" do cabeçalho vem de `calculateProvaAlvoTarget` (ganho projetado baseado em dias até a prova). O "Requisito PRO" vem de `targetTimeSec` (benchmark fixo do nível). O "Pódio" é mockado (4200s).

Por ora, o pódio é mock e será substituído por dados reais. A meta do cabeçalho e o requisito PRO são conceitualmente diferentes (meta pessoal realista vs. requisito da franquia). Quando os dados de pódio forem reais, a meta do cabeçalho poderá ser unificada. Neste momento, não altero a lógica de metas, pois o mock de pódio será removido em breve.

---

### Resumo de edições

| Arquivo | Mudança |
|---|---|
| `src/utils/evolutionTimeframe.ts` | Recalcular `ratePerMonth` ajustado após ceil dos meses |
| `src/components/DiagnosticRadarBlock.tsx` | Fundir textos pódio, remover números do texto projeção, trocar "—" por "Aguardando" |
| `src/components/diagnostico/EvolutionProjectionCard.tsx` | Mesma mudança de texto da projeção (fallback sem AI) |

