

## Plano: Ignorar Plural no Fuzzy Matching de Exercícios

### Problema
"10 Wall Ball" gera aviso "Você quis dizer Wall Balls?" porque a Levenshtein distance entre "wall ball" e "wall balls" é 1 — que cai dentro do threshold. Mas é o **mesmo exercício**, só variando singular/plural. O mesmo acontece com "Box Jump" → "Box Jumps".

### Solução
Adicionar normalização de plural na função `normalizeForFuzzy` em `src/utils/parsingCoverage.ts`. Antes de comparar, remover o "s" final (e variantes comuns como "es") de ambos os lados.

### Mudança técnica

**Arquivo: `src/utils/parsingCoverage.ts`**

1. **Criar função `stripPlural(text)`** que remove sufixo plural simples:
   - "s" final (wall balls → wall ball, box jumps → box jump)
   - "es" final quando precedido de consoante (lunges → lung — mas cuidado com "raises")
   - Abordagem conservadora: só remover "s" final se a palavra base tiver 4+ caracteres

2. **Aplicar na comparação dentro de `fuzzyMatchExerciseName`**:
   - Após normalizar ambos os lados, se `stripPlural(a) === stripPlural(b)` → tratar como match exato (retornar `null`, sem warning)
   - Isso é checado **antes** do cálculo de Levenshtein

### Resultado
| Linha | Antes | Depois |
|-------|-------|--------|
| 10 Wall Ball | ⚠️ "Você quis dizer Wall Balls?" | ✅ Sem aviso |
| 10 Box Jump | ⚠️ "Você quis dizer Box Jumps?" | ✅ Sem aviso |
| 10 Bac Squart | ⚠️ "Você quis dizer Back Squat?" | ⚠️ Mantém (é typo real) |

### Arquivo modificado
- `src/utils/parsingCoverage.ts` — apenas lógica de normalização plural

