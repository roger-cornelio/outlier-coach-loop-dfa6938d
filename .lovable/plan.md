

## Plano: Remover validação residual de bloco Principal no TextModelImporter

### Problema
A validação de preview em `TextModelImporter.tsx` ainda verifica `isMainWod` (linhas 1120-1135), gerando erros "dia(s) sem bloco Principal marcado" que bloqueiam o avanço para preview.

### Alteração em `src/components/TextModelImporter.tsx`

**1. Remover checagem de `isMainWod` na validação de preview (linhas 1118-1151)**
- Remover o bloco que verifica `mainBlocks.length === 0` e `mainBlocks.length > 1`
- Remover as variáveis `daysWithoutMain` e `daysWithMultipleMain`
- Remover as mensagens de erro correspondentes
- Manter apenas a validação de **categoria** (que é a única exigência restante)

**2. Atualizar comentário do GUARD 3 (linha 1188)**
- De "Categoria + bloco principal" para "Categoria obrigatória"

### Resultado
- Único bloqueio para preview: blocos sem categoria
- Bloco principal continua sendo calculado automaticamente (badge visual), mas não bloqueia nada

