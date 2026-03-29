

## Plano: Adicionar reconhecimento de rep schemes descendentes e "cal" líder ao estimador de tempo

### O que acontece hoje

O `estimateWorkoutTime.ts` usa regex para extrair padrões como `30 cal Bike` ou `1000m Remo`, mas:

1. **Rep schemes descendentes** (`28, 20, 16` ou `21-15-9`) não são reconhecidos — os números ficam soltos sem vínculo com o exercício da linha seguinte
2. **"cal Air Bike"** (cal no começo da linha, sem número na frente) não é reconhecido como calorias de bike
3. Resultado: a estimativa de tempo fica imprecisa para esses formatos comuns de treino

### O que vai mudar

**Arquivo: `src/utils/estimateWorkoutTime.ts`**

**1. Detectar rep schemes descendentes e vincular ao exercício seguinte**

Antes de rodar os regex de extração, processar o texto linha a linha. Quando encontrar uma linha que é apenas números separados por vírgula ou hífen (ex: `28, 20, 16` ou `21-15-9`), somar os valores e vincular ao exercício da **próxima linha**.

Exemplo:
- Linha 1: `28, 20, 16` → soma = 64
- Linha 2: `cal Air Bike` → 64 calorias × pacing bike = 320s

**2. Reconhecer "cal ExercícioNome" como calorias**

Adicionar regex para o padrão onde "cal" vem antes do nome do exercício (sem número na mesma linha). Quando esse padrão é detectado e existe um rep scheme vinculado da linha anterior, usar a soma como quantidade de calorias.

**3. Reconhecer exercício solo após rep scheme como reps genéricas**

Se a linha após o rep scheme não contém "cal", tratar a soma como repetições genéricas daquele exercício.

### Lógica resumida

```text
Para cada linha do texto:
  Se linha = apenas números (28,20,16 ou 21-15-9):
    → guardar soma (64) como "pendingReps"
  Se linha seguinte começa com "cal":
    → criar item bike com pendingReps × pacing.bike
  Senão:
    → criar item genérico com pendingReps × pacing.genericRep
  Limpar pendingReps
```

### Resultado esperado

- `28, 20, 16` + `cal Air Bike` → 64 cal × 5s = 320s + transição
- `7, 5, 3` + `Bar Push Press` → 15 reps × 3s = 45s + transição
- Multiplicador de rounds continua funcionando normalmente sobre esses valores
- Nenhuma mudança visual — apenas a precisão da estimativa de tempo nos cards melhora

### Arquivo envolvido
- `src/utils/estimateWorkoutTime.ts` — nova função de pré-processamento de linhas + regex para "cal NomeExercício"

