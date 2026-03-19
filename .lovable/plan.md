

## Plano: Identificar estruturas sem espaço + mostrar sintaxe correta na UI

### Problema
O coach escreve `2rounds` (sem espaço, sem `**`). Três funções falham:

1. **`PLAIN_ROUNDS_PATTERN`** em `workoutStructures.ts`: `/^\d+\s+Rounds?$/i` — exige espaço → cálculo de multiplicador falha
2. **`STRUCTURAL_LINE_PATTERNS`** em `blockDisplayUtils.ts`: `/^\d+\s+Rounds?\s*$/i` — exige espaço → não reconhece como estrutura
3. **`normalizeStructureLabel`** em `blockDisplayUtils.ts`: só extrai labels de `**...**` → "2rounds" sem asteriscos nunca vira badge

Resultado: "2rounds" é tratado como exercício, multiplicador = 1, calorias/tempo errados, e a UI não mostra badge.

### Mudanças (2 arquivos)

**1. `src/utils/workoutStructures.ts`** — Regex mais flexível

Mudar `\s+` para `\s*` nos padrões plain text:
- `PLAIN_ROUNDS_PATTERN`: `/^(\d+)\s*Rounds?\s*$/i` (aceita "2rounds", "2 rounds", "2ROUNDS")
- `ROUNDS_PATTERN` (wrapped): `/^\*\*\s*(\d+)\s*Rounds?\s*\*\*$/i`

**2. `src/utils/blockDisplayUtils.ts`** — Duas mudanças

a) **`STRUCTURAL_LINE_PATTERNS`** (linha 395): Mudar `\s+` para `\s*`:
```
/^\d+\s*Rounds?\s*$/i
```

b) **`normalizeStructureLabel`** (linhas 86-97): Expandir para aceitar plain text, retornando o label formatado corretamente:
- Se `**2 ROUNDS**` → retorna `"2 ROUNDS"` (já funciona)
- Se `2rounds` → retorna `"2 ROUNDS"` (novo)
- Se `EMOM20` → retorna `"EMOM 20"` (novo)

A função passa a usar `parseStructureLine` do `workoutStructures.ts` para detectar plain text, e formata o label para display limpo. Isso garante que na UI sempre aparece a melhor sintaxe possível (ex: "2 ROUNDS" com badge laranja), independente de como o coach escreveu.

### Resultado
- Coach escreve `2rounds` → motor reconhece como MULTIPLIER com value=2 → cálculos corretos
- UI mostra badge laranja **2 ROUNDS** (formatado bonito)
- Nenhuma mudança de banco, design, ou fluxo do coach

