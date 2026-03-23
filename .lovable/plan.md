

## Plano: Corrigir crash "Cannot read properties of undefined (reading 'toLowerCase')"

### Problema
O `extractTimeFromContent` em `workoutEstimation.ts` (linha 82) faz `content.toLowerCase()` sem verificar se `content` é `undefined`. Quando um bloco do rascunho não tem o campo `content` preenchido, o motor crasheia e o ErrorBoundary exibe a tela de erro.

O mesmo problema pode ocorrer em `estimateForTimeMinutes` (linha 131) e no `switch` que usa `block.content` (linha 223).

### Correção

**Arquivo: `src/utils/workoutEstimation.ts`**

1. **Linha 82** — `extractTimeFromContent`: adicionar guard `if (!content) return null;` no início da função
2. **Linha 208** — chamada `extractTimeFromContent(block.content)`: passar `block.content || ''` como fallback
3. **Linha 223** — `estimateForTimeMinutes(block.content, level)`: passar `block.content || ''`

Correção defensiva em 3 pontos, sem alterar lógica de cálculo.

### Resultado
- Blocos sem `content` retornam estimativa por tipo (fallback existente no switch/case)
- Sem crash, sem tela cinza

