

## Verificação Ponta a Ponta: Interpretação IA → Tela do Atleta

### Descobertas

Analisando o fluxo completo, identifiquei **1 problema principal** e **1 inconsistência menor**:

---

### Problema Principal: Total de Kcal no Header é Sempre 0

O header do treino diário (onde mostra "⏱ Xmin" e "🔥 ~Y kcal") usa `estimateWorkout()` para calcular os totais. Porém:

- `estimateWorkout()` retorna `estimatedKcalTotal: 0` **sempre** (linha 295 do `workoutEstimation.ts`: `estimatedKcalTotal: 0, // Kcal is now calculated by Physics Engine`)
- O motor de física (`computeBlockMetrics`) calcula kcal por bloco corretamente — mas ninguém soma esses valores para o header
- Resultado: o header nunca mostra calorias totais do dia, embora cada bloco individualmente mostre suas kcal

**Onde o dado se perde:**

```text
IA interpreta → parsedExercises ✅
Motor calcula por bloco → estimatedKcal por bloco ✅  
Header soma totais → usa estimateWorkout() → kcal = 0 ❌
```

### Inconsistência Menor: Tempo do Header vs Tempo dos Blocos

- O header usa `estimateWorkout()` para tempo (regex heurístico baseado no conteúdo textual)
- Cada bloco usa `computeBlockMetrics()` (motor de física com dados da IA)
- Podem divergir: o header pode dizer 45min enquanto a soma dos blocos dá 55min

---

### Plano de Correção

**Arquivo: `src/components/WeeklyTrainingView.tsx`**

1. Após calcular `workoutEstimation`, somar o `estimatedKcal` e `estimatedMinutes` de cada bloco usando `computeBlockMetrics` (mesmo cálculo já feito inline nos blocos)
2. Usar esses totais no header em vez dos valores zerados de `estimateWorkout()`
3. Isso garante que header e blocos usem a **mesma fonte de verdade** (motor de física)

**Lógica:**
- Iterar sobre `currentWorkout.blocks`
- Para cada bloco com `parsedExercises` e `parseStatus === 'completed'`, chamar `computeBlockMetrics`
- Somar `estimatedKcal` e `estimatedDurationSec` de todos os blocos
- Para blocos sem dados parsed, usar fallback do `workoutEstimation`
- Exibir os totais agregados no header

### Resultado Esperado

| Métrica | Antes | Depois |
|---------|-------|--------|
| Header Kcal | Sempre 0 (nunca aparece) | Soma real dos blocos (~200-500 kcal) |
| Header Tempo | Heurística textual | Motor de física (consistente com blocos) |
| Blocos individuais | Corretos | Sem mudança |

### Arquivo modificado
- `src/components/WeeklyTrainingView.tsx` — ~20 linhas (novo useMemo para agregar totais)

