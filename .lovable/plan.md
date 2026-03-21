

## Plano: Corrigir Classificação Consultando Dicionário de Exercícios

### Problema
`classifyUnmatchedLine` usa apenas regex. "Max Wall Ball 9 kg" é classificado como "exercício novo" quando "Wall Ball" já existe no banco. O mesmo para "30/30" Side Plank", "A- 5 Clean", etc.

### Mudanças

**1. `src/utils/parsingCoverage.ts`**

- Adicionar função `extractBaseExerciseName(text)` que limpa:
  - Prefixos A-/B-/C-/D- e variantes A1)/B2)
  - "Max", "Heavy", "Single" e outros modificadores
  - Números, unidades (kg, cal, m), notações de tempo (30", 40")
  - Razões como 32/32, 30/25
- Atualizar `classifyUnmatchedLine(text, exerciseNames?: string[])`:
  - Manter as heurísticas regex existentes para números puros
  - **Após** as heurísticas, extrair o nome-base e comparar (case-insensitive, sem acentos) contra a lista de exercícios
  - Se o nome-base **contém** um exercício do dicionário → `'uninterpretable'` (problema de formatação)
  - Se não bate → `'new_exercise'` (realmente novo)
- Atualizar `calculateParsingCoverage(parseResult, exerciseNames?)` para receber e passar os nomes

**2. `src/components/TextModelImporter.tsx`**

- Na chamada `calculateParsingCoverage(result)`, passar `exerciseLibrary.map(e => e.name)`:
  ```ts
  const coverage = calculateParsingCoverage(result, exerciseLibrary.map(e => e.name));
  ```

### Resultado Esperado

| Linha | Antes | Depois |
|-------|-------|--------|
| Max Wall Ball 9 kg | 🟡 exercício novo | 🔴 não interpretada |
| 30/30" Side Plank | 🟡 exercício novo | 🔴 não interpretada |
| A- 5 Heavy Single Clean | 🟡 exercício novo | 🔴 não interpretada |
| B- 40" Max Row | 🟡 exercício novo | 🔴 não interpretada |
| Squat to Stand | 🟡 exercício novo | 🟡 exercício novo ✅ |
| Pike Lunges | 🟡 exercício novo | 🟡 exercício novo ✅ |

### Arquivos Modificados
- `src/utils/parsingCoverage.ts` — lógica de classificação com dicionário
- `src/components/TextModelImporter.tsx` — 1 linha alterada para passar nomes

