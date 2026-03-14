

# Melhorias Visuais Impactantes — "Análise Última Prova"

## Problema
As alterações anteriores (p-5, leading-relaxed) são micro-ajustes de espaçamento que não produzem diferença visual perceptível. O atleta não nota mudança.

## Proposta de Mudanças Reais

### 1. Cards com mais presença visual
- Adicionar `shadow-lg` ou `shadow-md` nos 3 cards (Limitador, Ganho Potencial, Próximo Passo)
- Aumentar o `border` lateral de `border` para `border-l-4` com a cor semântica (vermelho, verde, âmbar) — cria uma faixa lateral forte que diferencia cada card
- Fundo mais contrastante: de `bg-red-950/80` para `bg-red-950/60` com `backdrop-blur-sm`

### 2. Título do limitador com mais destaque
- Nome da estação (ex: "Wall Balls") com `text-xl font-bold` em vez de `text-lg`
- Label "LIMITADOR" com badge colorido em vez de texto simples

### 3. Seção de análise detalhada mais estruturada
- O bloco expandido ("Ocultar detalhes") usa `border-l-2` com `pl-3` — aumentar para `border-l-3` com `pl-4` e adicionar fundo sutil (`bg-card/30`) para separar visualmente do conteúdo principal
- Separadores entre as seções (Limitador completo, Projeção, Impacto)

### 4. Bloco "Direcionamento" (card âmbar inferior)
- Adicionar ícone (ex: `Compass` ou `ArrowRight`) ao lado do título "Próximo Passo"
- Bullets com ícone em vez de "•" textual

### 5. Espaçamento entre cards
- De `space-y-4` para `space-y-5` (mais respiro entre os blocos)
- Container interno com `p-4` em vez de `px-2 pb-3`

### Arquivos alterados
- `src/components/DiagnosticRadarBlock.tsx` (linhas 2370-2440)

