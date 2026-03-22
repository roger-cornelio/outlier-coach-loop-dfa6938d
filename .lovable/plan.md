

## Plano: Corrigir cálculo de Carry para considerar carga externa

### Problema
A fórmula metabólica (MET) para `carry` ignora a carga externa (`loadKg`). Um Farmer Carry com 64kg gasta significativamente mais energia que sem carga, mas o motor calcula o mesmo valor.

Resultado: AMRAP 2 mostra ~90 kcal quando deveria ser ~120-140 kcal.

### Correção

**Arquivo:** `src/utils/computeBlockKcalFromParsed.ts`

#### 1) Carry: MET ajustado pela carga
Na branch `metabolic` do `computeExerciseKcal`, quando o slug é `carry`, aplicar um multiplicador baseado na carga relativa ao peso corporal:

```
metEfetivo = metBase × (1 + loadKg / pesoKg)
```

Exemplo: Farmer Carry 32/32 (64kg), atleta 75kg:
- metEfetivo = 6.0 × (1 + 64/75) = 6.0 × 1.85 = 11.1
- kcal = 11.1 × 75 × (0.5/60) = 6.94 kcal/round (vs 3.75 atual)
- ~85% mais calorias por round → total AMRAP sobe para ~120-130 kcal

#### 2) Garantir que a IA retorna loadKg para Farmer Carry
O "32/32" deve ser interpretado como loadKg = 64 (soma). Se a IA não estiver somando, ajustar o prompt na Edge Function.

### Não alterar
- Nenhuma outra fórmula ou pattern
- Nenhuma lógica de UI, hooks ou fluxos
- Layout inalterado

