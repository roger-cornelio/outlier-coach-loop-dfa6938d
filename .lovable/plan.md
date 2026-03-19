

## Plano: Auto-injeção de estrutura do título no conteúdo do bloco

### Contexto
Quando o coach escreve "AMRAP 15'" como título do bloco, o motor de cálculo não encontra a estrutura no `content` e calcula duração/calorias erradas (tempo de 1 round ao invés do tempo fixo). A correção atual (lançada anteriormente) detecta estruturas no título como fallback — mas isso cria **duas fontes de verdade** e exige que cada consumidor passe `blockTitle`.

### Abordagem robusta: Uma única fonte de verdade

**Princípio**: O `block.content` deve conter TUDO que define o treino, incluindo estruturas. O título é apenas um rótulo de exibição.

Se o título contém uma estrutura (AMRAP, EMOM, ROUNDS, FOR TIME) que **não aparece** no conteúdo, o sistema **injeta automaticamente** essa estrutura como primeira linha do conteúdo no momento da montagem do bloco.

### Ponto de injeção

**Arquivo**: `src/components/TextModelImporter.tsx` — função de mapeamento de blocos (~linha 377)

Este é o ponto onde `block.title` e `block.content` são montados a partir do resultado do parser. É o local ideal porque:
1. Acontece **antes** de qualquer cálculo, save ou publish
2. O coach nunca perde informação (a estrutura continua visível no título)
3. O `content` passa a ser auto-suficiente para todos os consumidores

**Lógica**:
```
1. Usar parseStructureLine(block.title) para detectar estrutura no título
2. Se encontrou (FIXED_TIME ou MULTIPLIER):
   a. Verificar se o content já contém essa estrutura (parseStructureLine em cada linha)
   b. Se NÃO contém → injetar como primeira linha do content (formato **STRUCT X'**)
   c. Se JÁ contém → não duplicar
```

### Formato da linha injetada

Para manter consistência com o parser existente, injetar no formato wrapped:
- `**AMRAP 15'**` para FIXED_TIME AMRAP
- `**EMOM 20'**` para FIXED_TIME EMOM  
- `**3 ROUNDS**` para MULTIPLIER
- `**FOR TIME**` para DERIVED_TIME

### Impacto nos consumidores

| Consumidor | Situação atual | Após a mudança |
|------------|---------------|----------------|
| `computeBlockMetrics` | Precisa de `blockTitle` como fallback | Funciona só com `blockContent` (pode remover fallback de título) |
| `parseBlockStructures` | Não vê estrutura se só está no título | Sempre encontra no content |
| `buildExerciseMultiplierMap` | Não aplica multiplicador de ROUNDS do título | Aplica corretamente |
| `getBlockTimeMeta` | Depende de `durationSec`/`durationMinutes` | Content agora tem a info |
| Views (WeeklyTraining, WorkoutExecution) | Precisariam passar título | Funcionam sem mudança |

### Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Título ambíguo ("AMRAP + Strength") | `parseStructureLine` retorna null para texto misto — não injeta |
| Título e conteúdo conflitantes | Conteúdo tem prioridade — se já tem estrutura, título é ignorado |
| Duplicação visual | A linha injetada aparece como StructureBadge no editor, igual a se o coach tivesse escrito. Não aparece duplicada porque a view já filtra título do rawLines |
| Coach edita título depois | Re-parse ou re-importação regenera o content |

### Etapas de implementação

1. **Criar função utilitária** `ensureStructureInContent(title: string, content: string): string`
   - Arquivo: `src/utils/workoutStructures.ts` (exportada)
   - Retorna content com a estrutura injetada se necessário

2. **Aplicar no TextModelImporter** (~linha 426)
   - Antes de montar `content: trainingLines.join('\n')`, chamar `ensureStructureInContent`
   - Também aplicar no `rawLinesFiltered` para manter consistência

3. **Simplificar computeBlockMetrics**
   - Remover o parâmetro `blockTitle` e a função `detectFixedTimeMinutes`
   - A detecção agora acontece naturalmente via `parseBlockStructures(content)`

4. **Atualizar WeeklyTrainingView**
   - Remover passagem de `block.title` na chamada a `computeBlockMetrics`

### Escopo
- 3 arquivos modificados: `workoutStructures.ts`, `TextModelImporter.tsx`, `computeBlockKcalFromParsed.ts`
- 1 ajuste menor em `WeeklyTrainingView.tsx`
- Zero mudanças no banco de dados
- Zero mudanças na Edge Function de parsing

### Decisão pendente
Aprovar para implementação?
