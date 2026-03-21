

## Plano: Corrigir Cálculo de Duração — durationSeconds × sets

### Problema
`durationSeconds` retornado pela IA é **por set**, mas o motor trata como duração total. Um Tabata (8×20s) conta apenas 20s em vez de 240s.

### Correção

**Arquivo: `src/utils/computeBlockKcalFromParsed.ts`**

Três blocos idênticos (linhas 180, 193, 208) que fazem:
```ts
durationSec = exercise.durationSeconds;
```

Serão substituídos por:
```ts
durationSec = exercise.durationSeconds * sets;
if (sets > 1) {
  const restPerSet = exercise.restSeconds || 0;
  durationSec += (sets - 1) * restPerSet;
}
```

**Nota**: O default de `restSeconds` muda de `60` para `0` nestes branches — quando a IA fornece `durationSeconds` explícito, ausência de rest significa zero (diferente do fallback por reps onde 60s é conservador).

### Impacto
- Tabata 8×20s/10s: 20s → 240s (~4min) + descansos
- Qualquer exercício com `durationSeconds` + `sets > 1`: corrigido
- Exercícios sem `durationSeconds` (baseados em reps): sem mudança
- AMRAPs/EMOMs: sem mudança (fixedTime override)

### Arquivo modificado
- `src/utils/computeBlockKcalFromParsed.ts` — 3 blocos if (~5 linhas cada)

