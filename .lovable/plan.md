

## Plano: Reposicionar painel "Nível Competitivo"

### Situação atual
O painel "Nível Competitivo" (última prova, meta, faltam, previsão, barra de progresso, prova alvo) está dentro do **BLOCO 1** (header de identidade), linhas 1875-2061.

A ordem atual é:
1. Header (identidade + Nível Competitivo embutido)
2. Jornada Outlier
3. Projeção de Evolução

### Nova ordem desejada
1. Header (apenas identidade, sem Nível Competitivo)
2. Jornada Outlier
3. **Nível Competitivo** (movido para cá)
4. Projeção de Evolução

### Alteração em `src/components/DiagnosticRadarBlock.tsx`

**1. Remover o bloco "Nível Competitivo"** de dentro do `motion.div` do header (linhas 1875-2061) — manter apenas o `ImportProvaInlineCTA` para quando não há prova.

**2. Inserir o bloco "Nível Competitivo" como seção independente** entre "Jornada Outlier" (linha 2178) e "Projeção de Evolução" (linha 2180). Envolver em `motion.div` com animação consistente. Manter todo o conteúdo (4 cards de métricas, barra de progresso, frase de ação, prova alvo, botão ghost top%).

Nenhuma alteração de lógica ou visual — apenas reposicionamento.

