

## Plano: Garantir reconhecimento de aspas ASCII para duração

### Problema raiz

Os regexes de duração usam aspas Unicode dentro de classes de caracteres (`["""″]`), mas podem **não conter** a aspa ASCII padrão `"` (U+0022) — que é exatamente o que muitos teclados inserem. Se o coach digita `30"` com aspa reta, o sistema não reconhece como tempo e a linha vai parar na lista de "Sugerir exercício".

O mesmo pode acontecer com a aspa simples `'` (U+0027) para minutos.

### Solução

Substituir as classes de caracteres por versões com **escapes Unicode explícitos**, garantindo que não haja ambiguidade:

- Segundos: `\u0022` (reta), `\u201C` (esquerda curva), `\u201D` (direita curva), `\u2033` (prime duplo), ou `''` (duas simples)
- Minutos: `\u0027` (reta), `\u2018` (esquerda curva), `\u2019` (direita curva), `\u2032` (prime)

### Arquivos alterados

**1. `src/utils/unitDetection.ts`** — TIME_PATTERNS, regexes de segundos e minutos

**2. `src/utils/lineSemanticExtractor.ts`** — METRIC_PATTERNS, 3 regexes de duração com aspas

### Resultado esperado

- `30" air Bike` → reconhecido como exercício com duração (30 segundos)
- `60" bike` → idem
- `2' Air Bike` → reconhecido como duração (2 minutos)
- Independente do teclado, as aspas sempre são detectadas

