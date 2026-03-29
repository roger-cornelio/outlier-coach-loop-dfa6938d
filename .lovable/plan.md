

## Plano: Normalizar prefixos de equipamento no matching de exercícios

### Problema

O dicionário tem "DB Step Box" mas o coach escreve "Kb Step Box". O matching atual compara strings por substring (`includes`), então "kb step box" nunca vai conter "db step box". Resultado: aparece como exercício novo quando na verdade é o mesmo movimento com equipamento diferente.

### Solução

Adicionar uma camada de normalização de equipamento no `matchesDictionary`. Antes de comparar, remover prefixos de equipamento conhecidos (KB, DB, BB, Bar, Dumbbell, Kettlebell, Barbell, Single Arm, Double) tanto do nome extraído quanto dos nomes do dicionário.

Se após a remoção o nome-base for igual, é o mesmo exercício.

### Exemplo

```text
Coach escreve: "Kb Step Box"
Dicionário tem: "DB Step Box"

Após strip:
  "kb step box" → "step box"
  "db step box" → "step box"
  → Match! ✓
```

### O que muda

**Arquivo: `src/utils/parsingCoverage.ts`**

1. Nova função `stripEquipmentPrefix(name)` que remove prefixos: `kb`, `db`, `bb`, `bar`, `barbell`, `kettlebell`, `dumbbell`, `single arm`, `double`, `single`
2. Na função `matchesDictionary`, além da comparação atual, fazer uma segunda comparação com os nomes sem prefixo de equipamento
3. Na função `fuzzyMatchExerciseName`, aplicar a mesma normalização para evitar falsos positivos de typo

### Resultado

- "Kb Step Box" reconhecido se "DB Step Box" existe no dicionário
- "Barbell Row" reconhecido se "DB Row" existe
- "Kettlebell Swing" reconhecido se "KB Swing" existe
- Zero impacto em exercícios sem prefixo de equipamento

