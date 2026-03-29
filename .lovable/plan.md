

## Plano: Corrigir 3 falhas de reconhecimento semântico

### Problemas encontrados

1. **`cal Air Bike`** — o regex de calorias exige número antes de "cal" (`\d+ cal`). Quando "cal" vem sozinho no início da linha, não é reconhecido.

2. **`125 kgs`** — o regex de carga usa `kg\b` (word boundary). Como "kgs" tem um "s" depois, o boundary não bate e a carga não é detectada. O mesmo vale para "lbs".

3. **`Max Sled Push`** — "Max" não está em nenhum padrão. Deveria ser reconhecido como intensidade (esforço máximo).

### Correções

**Arquivo: `src/utils/lineSemanticExtractor.ts`**

1. **Carga plural** — mudar `kg|lb` para `kgs?|lbs?` no regex de load (linha 49)
2. **"cal" líder** — adicionar novo regex de reps: `^\bcal\b` no início da linha, tipo `reps`
3. **"Max" como intensidade** — adicionar regex: `\bMax\b` seguido de nome de exercício, tipo `intensity`

**Arquivo: `src/utils/unitDetection.ts`**

1. **Carga plural** — mesma correção `kgs?|lbs?` nos padrões existentes (se houver detecção de carga)
2. **"cal" líder** — adicionar ao REPS_STRUCTURE_PATTERNS
3. **"Max" como esforço** — adicionar ao EFFORT_PATTERNS

### Resultado esperado

- `cal Air Bike` → **cal** (laranja, reps) + **Air Bike** (branco, exercício)
- `Max Sled Push 125 kgs` → **Max** (vermelho, intensidade) + **Sled Push** (branco, exercício) + **125 kgs** (vermelho, carga)
- `80kgs` → reconhecido como carga normalmente

### Arquivos
- `src/utils/lineSemanticExtractor.ts` (3 ajustes nos METRIC_PATTERNS)
- `src/utils/unitDetection.ts` (3 ajustes correspondentes)

